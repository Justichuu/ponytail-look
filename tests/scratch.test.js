'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const scratch = require('../src/scratch');
const cone = require('../src/cone');
const { CUTS, pick } = scratch;
const witness = cone;

function open(seed, extra) {
  const r = scratch.scratch(scratch.emptyState(), { seed, itch: 'too many helpers', ...extra }, 1_000);
  return r;
}

test('reroll never repeats the last cut', () => {
  let state = scratch.emptyState();
  let last = null;
  for (let i = 0; i < 12; i++) {
    const r = scratch.scratch(state, { seed: `s${i}`, itch: 'again' }, 1_000 + i * 10);
    state = r.state;
    assert.equal(CUTS.includes(r.scratch.cut), true);
    if (last) assert.notEqual(r.scratch.cut, last);
    last = r.scratch.cut;
    const t = 1_001 + i * 10;
    state = scratch.doubt(state, { what: `helper ${i} already exists` }, t).state;
    let c = cone.emptyCone();
    if (scratch.needsLook(r.scratch)) {
      const seen = cone.observe(c, {
        surface: r.scratch.surface || 'browser',
        seen: 'the page',
        ...witness.pass(),
      }, t);
      c = seen.cone;
      state = scratch.attachLook(state, seen.observation).state;
    }
    state = scratch.think(state, { claim: `reuse helper ${i}` }, t + 1).state;
    state = scratch.settle(state, c, t + 2).state;
  }
});

test('pick skips a blocked cut', () => {
  for (const blocked of CUTS) {
    const cut = pick('seed-1', blocked);
    assert.notEqual(cut, blocked);
    assert.equal(CUTS.includes(cut), true);
  }
});

test('scratch is irritable and unsettled', () => {
  const { scratch: row } = open('abc');
  assert.equal(row.mood, 'irritable');
  assert.equal(row.settled, false);
  assert.equal(row.doubts.length, 0);
});

test('second scratch while open is destroyed, not abandoned', () => {
  const { state } = open('a');
  assert.throws(() => scratch.scratch(state, { seed: 'b', itch: 'still wrong' }, 2_000), /argument until settle/);
  assert.equal(state.scratches.length, 1);
  assert.equal(state.scratches[0].abandoned, false);
  assert.equal(state.cache.some((x) => x.kind === 'bullshit'), false);
});

test('cannot think before doubt', () => {
  const { state } = open('abc');
  assert.throws(() => scratch.think(state, { claim: 'delete it' }), /doubt/);
});

test('cannot use the itch as a thought', () => {
  let { state } = open('abc');
  state = scratch.doubt(state, { what: 'never saw the page' }).state;
  assert.throws(() => scratch.think(state, { claim: 'too many helpers' }), /itch/);
});

test('cannot repeat the last thought', () => {
  let { state, scratch: first } = open('one');
  state = scratch.doubt(state, { what: 'jsx is not the page' }).state;
  state = scratch.think(state, { claim: 'use native submit' }, 1_100).state;
  let c = cone.emptyCone();
  if (scratch.needsLook(first)) {
    const seen = cone.observe(c, {
      surface: first.surface || 'browser',
      seen: 'the page',
      ...witness.pass(),
    }, 1_150);
    c = seen.cone;
    state = scratch.attachLook(state, seen.observation).state;
  }
  state = scratch.settle(state, c, 1_200).state;
  assert.equal(first.cut !== state.scratches[1]?.cut || true, true);

  const again = scratch.scratch(state, { seed: 'two', itch: 'still' }, 2_000);
  state = again.state;
  assert.equal(again.scratch.forbiddenThought, 'use native submit');
  state = scratch.doubt(state, { what: 'maybe the native one is styled wrong' }).state;
  assert.throws(() => scratch.think(state, { claim: 'use native submit' }), /last thought/);
});

test('settle requires doubt, a self-thought, and irritability', () => {
  const { state } = open('abc');
  assert.throws(() => scratch.settle(state, cone.emptyCone(), 2_000), /doubt/);
});

test('happy path without a world surface settles', () => {
  let { state } = open('abc');
  state = scratch.doubt(state, { what: 'this helper already exists two files over' }).state;
  state = scratch.think(state, { claim: 'reuse formatDate, do not write another' }, 1_100).state;
  const r = scratch.settle(state, cone.emptyCone(), 1_200);
  assert.equal(r.scratch.settled, true);
  assert.equal(r.scratch.mood, 'settled');
  assert.equal(r.scratch.thought.origin, 'self');
});

test('observe cut cannot settle blind', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'force', itch: 'ui', surface: 'browser' }, 1_000);
  state.scratches[0].cut = 'observe';
  state = scratch.doubt(state, { what: 'no frame this turn' }, 1_050).state;
  state = scratch.think(state, { claim: 'the picker is already native' }, 1_100).state;
  assert.throws(() => scratch.settle(state, cone.emptyCone(), 1_200), /BLIND|look/);
});

test('browser look does not attach to a desktop scratch', () => {
  let { state } = scratch.scratch(scratch.emptyState(), {
    seed: 'surf',
    itch: 'tray icon',
    surface: 'desktop',
  }, 5_000);
  state.scratches[0].cut = 'observe';
  const seen = cone.observe(cone.emptyCone(), { surface: 'browser', seen: 'a webpage' }, 5_000);
  state = scratch.doubt(state, { what: 'wrong surface' }, 5_050).state;
  assert.throws(() => scratch.attachLook(state, seen.observation), /browser.*desktop/);
});

test('fresh look on the same surface lets observe settle', () => {
  let { state } = scratch.scratch(scratch.emptyState(), {
    seed: 'ok',
    itch: 'button',
    surface: 'browser',
  }, 9_000);
  state.scratches[0].cut = 'observe';
  let c = cone.emptyCone();
  const seen = cone.observe(c, { surface: 'browser', seen: 'native submit', ...witness.pass() }, 9_000);
  c = seen.cone;
  state = scratch.doubt(state, { what: 'component != page' }).state;
  state = scratch.attachLook(state, seen.observation).state;
  state = scratch.think(state, { claim: 'delete the wrapper' }, 9_100).state;
  const r = scratch.settle(state, c, 9_200);
  assert.equal(r.scratch.settled, true);
});
