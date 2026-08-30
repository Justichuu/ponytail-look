'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cone = require('../src/cone');
const witness = cone;

test('empty cone is blind on world surfaces', () => {
  const c = cone.emptyCone();
  assert.equal(cone.allow(c, 'browser', 100).ok, false);
  assert.equal(cone.allow(c, 'unreal', 100).reason, 'blind');
  assert.equal(cone.allow(c, 'code', 100).ok, true);
});

test('look is fresh inside TTL and stale after', () => {
  let c = cone.emptyCone();
  const r = cone.observe(c, { surface: 'unreal', seen: 'courtyard, pawn at origin', source: 'unreal' }, 0);
  c = r.cone;
  assert.equal(cone.allow(c, 'unreal', 1_000).ok, true);
  assert.equal(cone.allow(c, 'unreal', cone.DEFAULT_TTL_MS + 1).ok, false);
});

test('browser look is unseen until the lamp is on', () => {
  let c = cone.emptyCone();
  c = cone.observe(c, { surface: 'browser', seen: 'a twitch at the top' }, 0).cone;
  const dark = cone.allow(c, 'browser', 1_000);
  assert.equal(dark.ok, false);
  assert.equal(dark.reason, 'unseen');
  c = cone.observe(c, { surface: 'browser', seen: 'the end', ...witness.pass() }, 2_000).cone;
  const lit = cone.allow(c, 'browser', 2_000);
  assert.equal(lit.ok, true);
  assert.equal(lit.reason, 'timelike');
});

test('same-tick twitch then lamp: last look wins', () => {
  let c = cone.emptyCone();
  c = cone.observe(c, { surface: 'browser', seen: 'twitch' }, 5_000).cone;
  c = cone.observe(c, { surface: 'browser', seen: 'end', ...witness.pass() }, 5_000).cone;
  const lit = cone.allow(c, 'browser', 5_000);
  assert.equal(lit.ok, true);
  assert.equal(lit.observation.seen, 'end');
});

test('a look carries the dwell bar', () => {
  const r = cone.observe(cone.emptyCone(), { surface: 'unreal', seen: 'pawn' }, 0);
  assert.equal(r.observation.dwellMs, cone.DEFAULT_DWELL_MS);
  assert.equal(r.observation.ttlMs, cone.DEFAULT_TTL_MS);
});

test('look requires a surface and evidence', () => {
  assert.throws(() => cone.observe(cone.emptyCone(), { seen: 'x' }), /surface/);
  assert.throws(() => cone.observe(cone.emptyCone(), { surface: 'browser' }), /seen or proof/);
});
