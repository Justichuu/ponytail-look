'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cone = require('../src/cone');
const scratch = require('../src/scratch');
const { getInstructions } = require('../src/cli');

test('open scratch instructions demand doubt and irritability', () => {
  const { state } = scratch.scratch(scratch.emptyState(), { seed: 'i1', itch: 'bloat' }, 1);
  const text = getInstructions(state, cone.emptyCone(), 1);
  assert.match(text, /scratch #1/);
  assert.match(text, /mood=irritable/);
  assert.match(text, /doubt: MISSING/);
  assert.match(text, /BLIND/);
  assert.match(text, /cache/);
  assert.match(text, /argument until settle/i);
});

test('idle status names clean and growing itch', () => {
  const { state } = scratch.scratch(scratch.emptyState(), { seed: 'i1', itch: 'bloat' }, 1);
  state.scratches[0].settled = true;
  const text = getInstructions(state, cone.emptyCone(), 1);
  assert.match(text, /PONYTAIL idle/);
  assert.match(text, /clean washes|Growing still itches/i);
});
