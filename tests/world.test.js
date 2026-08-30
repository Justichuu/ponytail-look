'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cone = require('../src/cone');
const { inferSurface } = cone;
const witness = cone;

test('date picker itch is the ponytail hole: inferred browser', () => {
  assert.equal(inferSurface('add a date picker'), 'browser');
  assert.equal(inferSurface('color picker please'), 'browser');
});

test('explicit surface wins', () => {
  assert.equal(inferSurface('add a date picker', 'unreal'), 'unreal');
});

test('unreal / hardware / desktop hints', () => {
  assert.equal(inferSurface('pawn in the viewport'), 'unreal');
  assert.equal(inferSurface('PCA9685 reads off'), 'hardware');
  assert.equal(inferSurface('tray icon missing'), 'desktop');
});

test('code-only itch is not a world surface', () => {
  assert.equal(inferSurface('too many helpers'), '');
  assert.equal(cone.isWorldSurface(inferSurface('too many helpers')), false);
});

test('allow rejects pre-shave photons', () => {
  let c = cone.emptyCone();
  c = cone.observe(c, { surface: 'browser', seen: 'old', ...witness.pass() }, 1_000).cone;
  const fresh = cone.allow(c, 'browser', 1_100);
  assert.equal(fresh.ok, true);
  const after = cone.allow(c, 'browser', 2_100, { since: 2_000 });
  assert.equal(after.ok, false);
  assert.equal(after.reason, 'pre-shave');
});
