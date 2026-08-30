'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cone = require('../src/cone');
const scratch = require('../src/scratch');
const { beard, itch } = scratch;
const witness = cone;

test('a growing beard is itchy without being an explain bug', () => {
  const { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  assert.equal(itch.growing(state), true);
  assert.equal(itch.growthLevel(state), 1);
  assert.equal(itch.explainLevel(state), 0);
  assert.equal(itch.displayItch(state), 'itchy');
  assert.equal(itch.moodFor(state), 'irritable');
});

test('shave is not growing and not that itch', () => {
  const { state } = beard.shave(scratch.emptyState(), 0);
  assert.equal(itch.growing(state), false);
  assert.equal(itch.growthLevel(state), 0);
  assert.equal(itch.displayItch(state), 'irritable');
});

test('caption that claims seen before the bottom becomes an explain bug', () => {
  let c = cone.emptyCone();
  const seen = cone.observe(c, {
    surface: 'browser',
    seen: 'Seen. You reached the bottom and confirmed.',
    claimedOn: true,
  }, 1_000);
  c = seen.cone;
  const state = beard.normalize(scratch.emptyState());
  itch.harvestExplain(state, c, 1_000);
  assert.equal(state.cache.some((x) => x.kind === 'explain'), true);
  assert.equal(itch.explainLevel(state), 2);
  assert.equal(itch.moodFor(state), 'really-itchy');
  assert.equal(witness.isOn(seen.observation, 1_000), false);
});

test('a real seen look does not harvest an explain bug', () => {
  let c = cone.emptyCone();
  const seen = cone.observe(c, {
    surface: 'browser',
    seen: 'Seen. You reached the bottom and confirmed.',
    claimedOn: true,
    bottom: true,
    manual: true,
    delayOff: true,
  }, 1_000);
  c = seen.cone;
  const state = beard.normalize(scratch.emptyState());
  itch.harvestExplain(state, c, 1_000);
  assert.equal(state.cache.some((x) => x.kind === 'explain'), false);
  assert.equal(witness.isOn(seen.observation, 1_000), true);
});

test('one explain bug blocks settle until it is named', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'the lamp lied' }, 1);
  beard.collect(state, {
    kind: 'explain',
    what: 'caption said seen before the bottom',
    from: 'explain',
    fromId: 'obs_x:explain',
  }, 2);
  state = scratch.doubt(state, { what: 'I only read the JSX' }).state;
  state = scratch.think(state, { claim: 'use native input type date' }, 3).state;
  assert.throws(() => scratch.settle(state, cone.emptyCone(), 4), /explain bug/);
  state = scratch.doubt(state, { what: 'the caption said seen before the bottom' }).state;
  const r = scratch.settle(state, cone.emptyCone(), 5);
  assert.equal(r.scratch.settled, true);
});

test('two explain bugs are really really itchy and want two doubts', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'the lamp lied twice' }, 1);
  beard.collect(state, { kind: 'explain', what: 'first wrong seen', from: 'explain', fromId: 'a:explain' }, 2);
  beard.collect(state, { kind: 'explain', what: 'second wrong seen', from: 'explain', fromId: 'b:explain' }, 3);
  assert.equal(itch.moodFor(state), 'really-really-itchy');
  state = scratch.doubt(state, { what: 'the caption said seen before the bottom' }).state;
  state = scratch.think(state, { claim: 'use native input type date' }, 4).state;
  assert.throws(() => scratch.settle(state, cone.emptyCone(), 5), /two doubts/);
  state = scratch.doubt(state, { what: 'still not the bottom' }).state;
  const r = scratch.settle(state, cone.emptyCone(), 6);
  assert.equal(r.scratch.settled, true);
});

test('clean does not wash an explain bug', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'a', itch: 'first' }, 1);
  beard.collect(state, { kind: 'bullshit', what: 'rot 0', from: 'scratch' }, 2);
  beard.collect(state, {
    kind: 'explain',
    what: 'caption said seen before the bottom',
    from: 'explain',
    fromId: 'obs_x:explain',
  }, 3);
  const washed = beard.clean(state);
  assert.equal(washed.kept.explain, 1);
  assert.equal(washed.state.cache.some((x) => x.kind === 'explain'), true);
  assert.equal(itch.moodFor(washed.state), 'really-itchy');
  assert.equal(itch.growing(washed.state), true);
});
