#!/usr/bin/env node
'use strict';

const cone = require('../src/cone');
const scratch = require('../src/scratch');

function line(n, what, result) {
  process.stdout.write(`${n}  ${what.padEnd(32)} ${result}\n`);
}

function main() {
  const t = 10_000;
  let state = scratch.emptyState();
  let c = cone.emptyCone();

  process.stdout.write('try  date picker  (one skill, rung 4)\n');

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

  const r = scratch.settle(state, c, t);
  line(4, 'native input type=date', r.scratch.mate ? 'mate' : 'settled');

  const ok = blind.startsWith('BLIND') && unseen.startsWith('UNSEEN') && allow.ok && r.scratch.mate;
  process.stdout.write(ok ? '\nrung 4 looked. one skill.\n' : '\ntry failed\n');
  return ok ? 0 : 1;
}

process.exitCode = main();
