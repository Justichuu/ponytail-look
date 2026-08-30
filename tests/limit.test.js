'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const scratch = require('../src/scratch');
const { beard, limit } = scratch;

function smear(state, n) {
  for (let i = 0; i < n; i++) {
    beard.collect(state, { kind: 'bullshit', what: `rot ${i}`, from: 'scratch' }, i);
  }
  return state;
}

test('ceiling is 7 when the cache still permits truth', () => {
  assert.equal(limit.ceiling(beard.emptyState()), 7);
  assert.equal(limit.extrasAllowed(beard.emptyState()), limit.LADDER_RUNGS);
  assert.equal(limit.cachePermitsTruth(beard.emptyState()), true);
});

test('ceiling is 0 when filth already zeros the product', () => {
  const state = smear(beard.emptyState(), beard.FILTH_LIMIT);
  assert.equal(beard.isFilthy(state), true);
  assert.equal(limit.cachePermitsTruth(state), false);
  assert.equal(limit.ceiling(state), 0);
});

test('fail closed: 7 times a dead cache is 0 extras', () => {
  const clean = limit.extrasAllowed(beard.emptyState());
  const dirty = limit.extrasAllowed(smear(beard.emptyState(), beard.FILTH_LIMIT));
  assert.equal(clean, 7);
  assert.equal(dirty, 0);
  assert.equal(clean * (dirty === 0 ? 0 : 1), 0);
});

test('filthy beard: extra argument is flicker, required gates still fill', () => {
  let { state } = scratch.scratch(scratch.emptyState(), { seed: 'abc', itch: 'too many helpers' }, 1);
  smear(state, beard.FILTH_LIMIT);
  scratch.current(state).cut = 'delete';
  scratch.current(state).surface = '';
  state = scratch.doubt(state, { what: 'a helper already exists' }, 2).state;
  assert.throws(() => scratch.doubt(state, { what: 'maybe another helper' }, 3), /cache already zeros truth/);
  const thought = scratch.think(state, { claim: 'reuse formatDate' }, 4);
  assert.equal(thought.scratch.thought.claim, 'reuse formatDate');
});
