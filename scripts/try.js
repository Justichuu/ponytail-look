#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cone = require('../src/cone');
const scratch = require('../src/scratch');

function loc(rel) {
  const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  return text.split(/\r?\n/).filter((row) => row.trim()).length;
}

function line(n, what, result) {
  process.stdout.write(`${n}  ${what.padEnd(32)} ${result}\n`);
}

function main() {
  const t = 10_000;
  let state = scratch.emptyState();
  let c = cone.emptyCone();
  const pile = loc('examples/overbuilt-picker.jsx');
  const fold = loc('examples/date.html');

  process.stdout.write(`try  date picker  (one skill, rung 4)\n`);
  process.stdout.write(`pile  examples/overbuilt-picker.jsx  ${pile} lines\n`);

  state = scratch.scratch(state, {
    itch: 'add a date picker',
    seed: 'try',
    surface: 'browser',
  }, t).state;
  state = scratch.doubt(state, { what: 'I have only read the JSX' }, t).state;
  state = scratch.think(state, { claim: 'use native input type date' }, t).state;

  let blind = 'FAIL';
  try {
    scratch.settle(state, c, t);
  } catch (err) {
    if (/BLIND|spacelike|look/i.test(err.message)) blind = 'BLIND  refused';
    else throw err;
  }
  line(1, 'settle from JSX', blind);

  const twitch = cone.observe(c, { id: 'try_twitch', surface: 'browser', seen: 'top of the form' }, t);
  c = twitch.cone;
  state = scratch.attachLook(state, twitch.observation).state;

  let unseen = 'FAIL';
  try {
    scratch.settle(state, c, t);
  } catch (err) {
    if (/UNSEEN|spacelike|bottom|Not seen|Waiting|Tap/i.test(err.message)) unseen = 'UNSEEN  refused';
    else throw err;
  }
  line(2, 'look without the lamp', unseen);

  const lit = cone.observe(c, {
    id: 'try_lamp',
    surface: 'browser',
    seen: 'plain text fields only',
    ...cone.pass({ delayOff: true, manualAt: t }),
  }, t);
  c = lit.cone;
  state = scratch.attachLook(state, lit.observation).state;
  const allow = cone.allow(c, 'browser', t);
  line(3, 'look bottom + tap', allow.ok ? 'FRESH' : allow.reason);

  let lib = 'FAIL';
  try {
    const libState = scratch.think(state, { claim: 'install flatpickr and wrap it' }, t).state;
    scratch.settle(libState, c, t);
  } catch (err) {
    if (/native input type=date|do not add/i.test(err.message)) lib = 'library  refused';
    else throw err;
  }
  line(4, 'keep the wrapper library', lib);

  const r = scratch.settle(state, c, t);
  line(5, 'native input type=date', r.scratch.mate ? 'mate' : 'settled');
  process.stdout.write(`fold  examples/date.html             ${fold} lines\n`);

  const ok = blind.startsWith('BLIND') && unseen.startsWith('UNSEEN') && allow.ok
    && lib.startsWith('library') && r.scratch.mate && pile > 80 && fold < 10;
  process.stdout.write(ok ? '\nrung 4 looked. the pile is not the product.\n' : '\ntry failed\n');
  return ok ? 0 : 1;
}

process.exitCode = main();
