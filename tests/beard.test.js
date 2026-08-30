'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cone = require('../src/cone');
const scratch = require('../src/scratch');
const beard = scratch.beard;
const witness = cone;

test('scratch deposits a crumb', () => {
  const { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many files' }, 1);
  assert.equal(state.cache.length, 1);
  assert.equal(state.cache[0].kind, 'crumb');
  assert.equal(state.cache[0].what, 'too many files');
});

function smear(state, n) {
  for (let i = 0; i < n; i++) {
    beard.collect(state, { kind: 'bullshit', what: `rot ${i}`, from: 'scratch' }, i);
  }
  return state;
}

function collapse(state, t) {
  let c = cone.emptyCone();
  const row = scratch.current(state);
  if (row && scratch.needsLook(row)) {
    const seen = cone.observe(c, {
      surface: row.surface || 'browser',
      seen: 'the page',
      ...witness.pass(),
    }, t);
    c = seen.cone;
    state = scratch.attachLook(state, seen.observation).state;
  }
  return scratch.settle(state, c, t).state;
}

function finish(state, claim, t) {
  state = scratch.doubt(state, { what: `already exists at ${t}` }, t).state;
  state = scratch.think(state, { claim }, t + 1).state;
  return collapse(state, t + 2);
}

test('stale look is harvested as dust on the open line', () => {
  let c = cone.emptyCone();
  const seen = cone.observe(c, { surface: 'browser', seen: 'login form', ttlMs: 10 }, 0);
  c = seen.cone;
  const { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many files', cone: c }, 50);
  assert.equal(state.cache.some((x) => x.kind === 'dust' && x.what === 'login form'), true);
});

test('shave clears cache and makes scratch smooth', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'bloat' }, 1);
  assert.ok(state.cache.length > 0);
  const cut = beard.shave(state, 10);
  assert.equal(cut.state.cache.length, 0);
  assert.equal(cut.state.scratches.length, 0);
  assert.equal(cut.state.hardness, beard.HARDNESS_SHAVE);
  assert.equal(cut.dumped.crumb, 1);
  assert.throws(() => scratch.scratch(cut.state, { seed: 'x', itch: 'again' }, 10), /smooth/);
});

test('failed grab leaves bullshit you can hold', () => {
  const { state } = beard.shave(scratch.emptyState(), 0);
  let s = state;
  for (let i = 0; i < beard.HARDNESS_SHAVE; i++) {
    try {
      scratch.scratch(s, { seed: `g${i}`, itch: 'please' }, 1);
      assert.fail('should be smooth');
    } catch (err) {
      assert.equal(err.code, 'SMOOTH');
      s = err.state;
    }
  }
  const r = scratch.scratch(s, { seed: 'finally', itch: 'please' }, 1);
  assert.equal(r.scratch.mood, 'irritable');
  assert.equal(r.state.hardness, beard.HARDNESS_SHAVE);
});

test('stubble time restores grip without cache', () => {
  const { state } = beard.shave(scratch.emptyState(), 0);
  const later = beard.STUBBLE_MS * beard.HARDNESS_SHAVE;
  const r = scratch.scratch(state, { seed: 'abc', itch: 'grown back' }, later);
  assert.equal(r.scratch.itch, 'grown back');
  assert.equal(r.state.cache.filter((x) => x.kind === 'crumb').length, 1);
});

test('look after shave is a crumb that helps grip', () => {
  let { state } = beard.shave(scratch.emptyState(), 0);
  const seen = cone.observe(cone.emptyCone(), { surface: 'unreal', seen: 'pawn at origin' }, 1).observation;
  state = beard.noteLook(state, seen, 1);
  assert.equal(beard.grip(state, 1), 1);
  assert.equal(state.cache[0].kind, 'crumb');
});

test('settled crumb is grip, not poison; last thought still dies', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  state = scratch.doubt(state, { what: 'helper exists' }).state;
  state = scratch.think(state, { claim: 'reuse formatDate' }, 2).state;
  state = collapse(state, 3);
  state = scratch.scratch(state, { seed: 'y', itch: 'still too many' }, 4).state;
  state = scratch.doubt(state, { what: 'maybe another helper' }).state;
  assert.throws(() => scratch.think(state, { claim: 'reuse formatDate' }, 5), /last thought/);
  state = scratch.think(state, { claim: 'delete the extra helper' }, 5).state;
  state = collapse(state, 6);
  state = scratch.scratch(state, { seed: 'three', itch: 'again' }, 7).state;
  state = scratch.doubt(state, { what: 'same helper still there' }).state;
  const thought = scratch.think(state, { claim: 'reuse formatDate' }, 8);
  assert.equal(thought.scratch.thought.claim, 'reuse formatDate');
});

test('replaced argument is not cached as bullshit', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'a', itch: 'too many helpers' }, 1);
  state = scratch.doubt(state, { what: 'maybe a package' }, 2).state;
  state = scratch.think(state, { claim: 'install a new util package' }, 2).state;
  state = scratch.think(state, { claim: 'reuse the local helper' }, 3).state;
  state = collapse(state, 4);
  state = scratch.scratch(state, { seed: 'c', itch: 'still helpers' }, 5).state;
  state = scratch.doubt(state, { what: 'do not panic-install' }, 6).state;
  const thought = scratch.think(state, { claim: 'install a new util package' }, 7);
  assert.equal(thought.scratch.thought.claim, 'install a new util package');
});

test('date picker itch cannot settle blind — ponytail rung 4', () => {
  const { state, scratch: row } = scratch.scratch(
    scratch.emptyState(),
    { seed: 'abc', itch: 'add a date picker' },
    1,
  );
  assert.equal(row.surface, 'browser');
  let s = scratch.doubt(state, { what: 'I have only read the JSX' }).state;
  s = scratch.think(s, { claim: 'use native input type date' }, 2).state;
  assert.throws(() => scratch.settle(s, cone.emptyCone(), 3), /BLIND|look/);
});

test('pre-shave look does not legalize a later world settle', () => {
  let c = cone.emptyCone();
  const seen = cone.observe(c, { surface: 'browser', seen: 'old page', ...witness.pass() }, 1_000);
  c = seen.cone;
  const { state } = beard.shave(scratch.emptyState(), 2_000);
  const later = 2_000 + beard.STUBBLE_MS * beard.HARDNESS_SHAVE;
  let s = scratch.scratch(state, { seed: 'ok', itch: 'the button', surface: 'browser' }, later).state;
  s = scratch.doubt(s, { what: 'that look was before the razor' }).state;
  s = scratch.attachLook(s, seen.observation).state;
  s = scratch.think(s, { claim: 'delete the wrapper' }, later + 1).state;
  assert.throws(() => scratch.settle(s, c, later + 2), /pre-shave|look/);
});

test('filthy beard cannot settle until the rot is named', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'f0', itch: 'too many helpers' }, 1);
  scratch.current(state).cut = 'delete';
  scratch.current(state).surface = '';
  smear(state, beard.FILTH_LIMIT + 1);
  assert.equal(beard.isFilthy(state), true);
  state = scratch.doubt(state, { what: 'a helper already exists' }, 20).state;
  state = scratch.think(state, { claim: 'reuse the first helper' }, 20).state;
  assert.throws(() => scratch.settle(state, cone.emptyCone(), 21), /filthy/);
  state = scratch.doubt(state, { what: 'the beard is filthy with leftover rot' }, 21).state;
  const r = scratch.settle(state, cone.emptyCone(), 22);
  assert.equal(r.scratch.settled, true);
});

test('trim needs a named part', () => {
  const { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  assert.throws(() => beard.trim(state, {}), /part/);
});

test('trim dumps only the kind you name and does not raise hardness', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'a', itch: 'first helper' }, 1);
  smear(state, 1);
  const beforeHard = state.hardness;
  const scratches = state.scratches.length;
  const cut = beard.trim(state, { kind: 'bullshit' });
  assert.ok(cut.dumped.bullshit >= 1);
  assert.equal(cut.dumped.crumb, 0);
  assert.equal(cut.state.hardness, beforeHard);
  assert.equal(cut.state.scratches.length, scratches);
  assert.equal(cut.state.cache.every((x) => x.kind !== 'bullshit'), true);
});

test('trim --what cuts one crumb and leaves the rest', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'a', itch: 'keep this' }, 1);
  state = finish(state, 'reuse the keeper', 2);
  state = scratch.scratch(state, { seed: 'b', itch: 'drop this' }, 10).state;
  const cut = beard.trim(state, { what: 'drop this' });
  assert.equal(cut.removed.length, 1);
  assert.equal(cut.state.cache.some((x) => x.what === 'keep this'), true);
  assert.equal(cut.state.cache.some((x) => x.what === 'drop this'), false);
});

test('trim filth unblocks settle without a shave', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 't0', itch: 'too many helpers' }, 1);
  smear(state, beard.FILTH_LIMIT + 1);
  assert.equal(beard.isFilthy(state), true);
  state = beard.trim(state, { kind: 'filth' }).state;
  assert.equal(beard.isFilthy(state), false);
  scratch.current(state).cut = 'delete';
  scratch.current(state).surface = '';
  state = scratch.doubt(state, { what: 'a helper already exists' }, 20).state;
  state = scratch.think(state, { claim: 'reuse the first helper' }, 20).state;
  const r = scratch.settle(state, cone.emptyCone(), 21);
  assert.equal(r.scratch.settled, true);
  assert.equal(r.state.hardness, 0);
});

test('clean washes bullshit and keeps the crumbs', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'a', itch: 'first helper' }, 1);
  smear(state, 2);
  const crumbs = state.cache.filter((x) => x.kind === 'crumb').length;
  const beforeHard = state.hardness;
  const scratches = state.scratches.length;
  const washed = beard.clean(state);
  assert.ok(washed.dumped.bullshit >= 1);
  assert.equal(washed.dumped.crumb, 0);
  assert.equal(washed.kept.crumb, crumbs);
  assert.equal(washed.growing, true);
  assert.equal(washed.state.hardness, beforeHard);
  assert.equal(washed.state.scratches.length, scratches);
  assert.equal(washed.state.cache.every((x) => x.kind !== 'bullshit' && x.kind !== 'dust'), true);
  assert.equal(beard.inspect(washed.state).itch, 'itchy');
  assert.equal(beard.inspect(washed.state).growing, true);
});

test('clean of a growing beard with no filth refuses — still itchy', () => {
  const { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  assert.throws(() => beard.clean(state), /itchy from growing/);
  assert.equal(beard.inspect(state).growing, true);
});

test('clean after grabbed air dumps the only grip and does not grow itch', () => {
  const { state } = beard.shave(scratch.emptyState(), 0);
  let s = state;
  try { scratch.scratch(s, { seed: 'g0', itch: 'please' }, 1); } catch (err) { s = err.state; }
  assert.equal(s.cache.some((x) => x.kind === 'bullshit'), true);
  const washed = beard.clean(s);
  assert.ok(washed.dumped.bullshit >= 1);
  assert.equal(washed.growing, false);
  assert.equal(washed.state.hardness, beard.HARDNESS_SHAVE);
  assert.equal(beard.inspect(washed.state).itch, 'irritable');
  assert.throws(() => scratch.scratch(washed.state, { seed: 'gone', itch: 'please' }, 1), /smooth/);
});

test('clean unblocks a filthy settle without a shave', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'c0', itch: 'too many helpers' }, 1);
  smear(state, beard.FILTH_LIMIT + 1);
  assert.equal(beard.isFilthy(state), true);
  const crumbs = state.cache.filter((x) => x.kind === 'crumb').length;
  state = beard.clean(state).state;
  assert.equal(beard.isFilthy(state), false);
  assert.equal(state.cache.filter((x) => x.kind === 'crumb').length, crumbs);
  scratch.current(state).cut = 'delete';
  scratch.current(state).surface = '';
  state = scratch.doubt(state, { what: 'a helper already exists' }).state;
  state = scratch.think(state, { claim: 'reuse the first helper' }, 20).state;
  const r = scratch.settle(state, cone.emptyCone(), 21);
  assert.equal(r.scratch.settled, true);
  assert.equal(r.state.hardness, 0);
  assert.equal(beard.inspect(r.state).growing, true);
});

test('trim crumbs after a shave can make the chin smooth again', () => {
  const { state } = beard.shave(scratch.emptyState(), 0);
  let s = state;
  for (let i = 0; i < beard.HARDNESS_SHAVE; i++) {
    try { scratch.scratch(s, { seed: `g${i}`, itch: 'please' }, 1); } catch (err) { s = err.state; }
  }
  s = scratch.scratch(s, { seed: 'held', itch: 'please' }, 1).state;
  assert.equal(beard.canScratch(s, 1).ok, true);
  s = finish(s, 'hold the stubble', 2);
  s = beard.trim(s, { kind: 'all' }).state;
  assert.equal(s.hardness, beard.HARDNESS_SHAVE);
  assert.throws(() => scratch.scratch(s, { seed: 'gone', itch: 'please' }, 1), /smooth/);
});
