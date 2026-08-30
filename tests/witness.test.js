'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cone = require('../src/cone');
const scratch = require('../src/scratch');
const witness = cone;

function seenFlags(extra) {
  return {
    bottom: true,
    manual: true,
    manualAt: 10_000,
    ...extra,
  };
}

function openPicker(t, seen, flags) {
  let { state } = scratch.scratch(
    scratch.emptyState(),
    { seed: 'abc', itch: 'add a date picker' },
    t,
  );
  const looked = cone.observe(cone.emptyCone(), {
    surface: 'browser',
    seen,
    ...flags,
  }, t);
  state = scratch.doubt(state, { what: 'I have only read the JSX' }).state;
  state = scratch.attachLook(state, looked.observation).state;
  return { state, cone: looked.cone, obs: looked.observation };
}

test('mate is the few-line claim, not another product', () => {
  assert.equal(witness.isMate('use native input type date'), true);
  assert.equal(witness.isMate('delete the wrapper'), true);
  assert.equal(witness.isMate('reuse formatDate'), true);
  assert.equal(witness.isMate('install flatpickr and wrap it'), false);
  assert.equal(witness.isMate('add a wrapper component library'), false);
});

test('fail closed: one bit off is off', () => {
  assert.equal(witness.and([true, false]), false);
  assert.equal(witness.and([true, true]), true);
});

test('picker look is not seen at the same instant', () => {
  const { state, cone: c } = openPicker(10_000, 'a form', seenFlags());
  const s = scratch.think(state, { claim: 'use native input type date' }, 10_000).state;
  assert.throws(() => scratch.settle(s, c, 10_000), /Waiting|Not seen|Holding/);
});

test('first twitch is not the bottom', () => {
  const t = 10_000;
  const { state, cone: c } = openPicker(t, 'a form', {
    bottom: false,
    manual: true,
    manualAt: t,
  });
  const s = scratch.think(state, { claim: 'use native input type date' }, t).state;
  assert.throws(() => scratch.settle(s, c, t + witness.DWELL_MS * 2), /bottom|end/);
});

test('bottom without a tap is not seen', () => {
  const t = 10_000;
  const { state, cone: c } = openPicker(t, 'a form', { bottom: true, manual: false });
  const s = scratch.think(state, { claim: 'use native input type date' }, t).state;
  assert.throws(() => scratch.settle(s, c, t + witness.DWELL_MS), /Tap the lamp/);
});

test('tap still holds for the second delay', () => {
  const t = 10_000;
  const { state, cone: c } = openPicker(t, 'a form', {
    bottom: true,
    manual: true,
    manualAt: t + witness.DWELL_MS,
  });
  const s = scratch.think(state, { claim: 'use native input type date' }, t).state;
  assert.throws(() => scratch.settle(s, c, t + witness.DWELL_MS), /Holding/);
});

test('delay off: bottom plus tap is enough', () => {
  const t = 10_000;
  const { state, cone: c } = openPicker(t, 'empty form', {
    short: true,
    manual: true,
    manualAt: t,
    delayOff: true,
  });
  const s = scratch.think(state, { claim: 'use native input type date' }, t).state;
  const r = scratch.settle(s, c, t);
  assert.equal(r.scratch.settled, true);
});

test('picker library thought is refused once seen', () => {
  const t = 10_000;
  const later = t + witness.DWELL_MS * 2;
  const { state, cone: c } = openPicker(t, 'a form, no date field', seenFlags({ manualAt: t }));
  const s = scratch.think(state, { claim: 'install flatpickr and wrap it' }, t).state;
  assert.throws(() => scratch.settle(s, c, later), /native input type=date/);
});

test('witness already showing native date refuses a wrapper', () => {
  const t = 10_000;
  const later = t + witness.DWELL_MS * 2;
  const { state, cone: c } = openPicker(t, '<input type="date"> already in the form', seenFlags({ manualAt: t }));
  const s = scratch.think(state, { claim: 'add a wrapper component library' }, t).state;
  assert.throws(() => scratch.settle(s, c, later), /native control/);
});

test('bottom, both delays, tap, native claim, settle', () => {
  const t = 10_000;
  const later = t + witness.DWELL_MS * 2;
  const { state, cone: c } = openPicker(t, 'plain text fields only', seenFlags({ manualAt: t }));
  const s = scratch.think(state, { claim: 'use native input type date' }, t).state;
  const r = scratch.settle(s, c, later);
  assert.equal(r.scratch.settled, true);
  assert.equal(r.scratch.mate, true);
});

test('explain names the missing bit', () => {
  const t = 10_000;
  const obs = { t, bottom: false, short: false, manual: false };
  assert.match(witness.explain(obs, t).why, /bottom/i);
});

test('source tree does not name the external site', () => {
  const root = path.join(__dirname, '..');
  const skip = new Set(['node_modules', '.git', 'data']);
  const needles = [
    Buffer.from('Y2h1dW1pbmQ=', 'base64').toString(),
    Buffer.from('anVzdGljaHV1', 'base64').toString(),
  ];
  const hits = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (skip.has(name)) continue;
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(js|md|toml|mdc|json|html)$/.test(name)) {
        const text = fs.readFileSync(p, 'utf8').toLowerCase();
        if (needles.some((n) => text.includes(n))) hits.push(p);
      }
    }
  }
  walk(root);
  assert.deepEqual(hits, []);
});
