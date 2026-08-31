'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cone = require('../src/cone');
const scratch = require('../src/scratch');
const witness = cone;
const { draw } = cone;

test('until settle you can go back to a different thought', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  state = scratch.doubt(state, { what: 'a helper already exists' }, 2).state;
  state = scratch.think(state, { claim: 'write another helper' }, 3).state;
  state = scratch.think(state, { claim: 'reuse formatDate' }, 4).state;
  assert.equal(state.scratches[0].thought.claim, 'reuse formatDate');
  const r = scratch.settle(state, cone.emptyCone(), 5);
  assert.equal(r.scratch.settled, true);
});

test('same thought twice is a dead argument, not a new one', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  state = scratch.doubt(state, { what: 'a helper already exists' }, 2).state;
  state = scratch.think(state, { claim: 'reuse formatDate' }, 3).state;
  assert.throws(() => scratch.think(state, { claim: 'reuse formatDate' }, 4), /argument already/);
});

test('same doubt twice is already in the argument', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  state = scratch.doubt(state, { what: 'never saw the page' }, 2).state;
  assert.throws(() => scratch.doubt(state, { what: 'never saw the page' }, 3), /already in the argument/);
});

test('same look twice is already this look', () => {
  let { state } = scratch.scratch(scratch.emptyState(), {
    seed: 'ok',
    itch: 'the button',
    surface: 'browser',
  }, 9_000);
  const seen = cone.observe(cone.emptyCone(), { surface: 'browser', seen: 'native submit', ...witness.pass() }, 9_000);
  state = scratch.doubt(state, { what: 'component != page' }, 9_050).state;
  state = scratch.attachLook(state, seen.observation).state;
  assert.throws(() => scratch.attachLook(state, seen.observation), /already these spectacles/);
});

test('doubt honors --now so argument order is real', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1_000);
  state = scratch.doubt(state, { what: 'never saw the page' }, 1_111).state;
  assert.equal(state.scratches[0].doubts[0].t, 1_111);
});

test('ponytail will argue 7 rungs; extra steps past that are a loop', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  state = scratch.doubt(state, { what: 'a helper already exists' }, 2).state;
  state = scratch.think(state, { claim: 'reuse formatDate' }, 3).state;
  for (let i = 0; i < 5; i++) {
    state = scratch.think(state, { claim: `reuse helper ${i}` }, 4 + i).state;
  }
  assert.equal(state.scratches[0].steps, scratch.ARG_LIMIT);
  assert.throws(
    () => scratch.think(state, { claim: 'one more wrapper' }, 20),
    /error margin/,
  );
  let c = cone.emptyCone();
  const row = scratch.current(state);
  if (row && scratch.needsLook(row) && !row.lookId) {
    const seen = cone.observe(c, {
      surface: row.surface || 'browser',
      seen: 'the page',
      ...witness.pass(),
    }, 20);
    c = seen.cone;
    state = scratch.attachLook(state, seen.observation).state;
  }
  const r = scratch.settle(state, c, 21);
  assert.equal(r.scratch.settled, true);
});

test('filling a missing gate still works at the limit', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  state = scratch.doubt(state, { what: 'first' }, 2).state;
  for (let i = 0; i < 6; i++) {
    state = scratch.doubt(state, { what: `extra ${i}` }, 3 + i).state;
  }
  assert.equal(state.scratches[0].steps, scratch.ARG_LIMIT);
  const thought = scratch.think(state, { claim: 'reuse formatDate' }, 20);
  assert.equal(thought.scratch.thought.claim, 'reuse formatDate');
});

test('draw prints the real mood, not a hardcoded irritable', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  state.scratches[0].mood = 'really-itchy';
  const svg = draw(cone.emptyCone(), state, 1);
  assert.match(svg, /mood=really-itchy/);
  assert.doesNotMatch(svg, /mood=irritable/);
});
