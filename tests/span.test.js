'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { beard, span } = require('../src/scratch');
const phi = require('../src/phi');

test('coincidence does not grow the beard', () => {
  let state = beard.emptyState();
  state = span.markHuman(state, 0);
  state = span.markAgent(state, phi.dwellMs - 1);
  const r = span.tick(state, phi.dwellMs - 1);
  assert.equal(r.span.kind, 'coincident');
  assert.equal(r.span.action, 'none');
  assert.equal(r.state.cache.length, 0);
});

test('lag inside the error bar fills a smooth chin', () => {
  let state = beard.shave(beard.emptyState(), 0).state;
  state = span.markHuman(state, 0);
  state = span.markAgent(state, phi.dwellMs);
  const r = span.tick(state, phi.dwellMs);
  assert.equal(r.span.kind, 'timelike');
  assert.equal(r.span.action, 'fill');
  assert.equal(r.state.cache.some((x) => x.kind === 'crumb' && x.from === 'span'), true);
});

test('lag inside the error bar grows a gripping beard', () => {
  let state = beard.emptyState();
  beard.collect(state, { kind: 'crumb', what: 'already long', from: 'scratch' }, 0);
  state = span.markHuman(state, 0);
  state = span.markAgent(state, phi.dwellMs * 2);
  const r = span.tick(state, phi.dwellMs * 2);
  assert.equal(r.span.kind, 'timelike');
  assert.equal(r.span.action, 'grow');
});

test('lag past the upper margin is dust, not a wash', () => {
  let state = beard.emptyState();
  beard.collect(state, { kind: 'crumb', what: 'hair', from: 'scratch' }, 0);
  beard.collect(state, { kind: 'bullshit', what: 'rot 0', from: 'scratch' }, 1);
  state = span.markHuman(state, 0);
  state = span.markAgent(state, phi.ttlMs + 1);
  const r = span.tick(state, phi.ttlMs + 1);
  assert.equal(r.span.kind, 'spacelike');
  assert.equal(r.span.action, 'dust');
  assert.equal(r.state.cache.some((x) => x.kind === 'bullshit'), true);
  assert.equal(r.state.cache.some((x) => x.kind === 'crumb' && x.what === 'hair'), true);
});
