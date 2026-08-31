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

function main() {
  const t = 10_000;
  let state = scratch.emptyState();
  let c = cone.emptyCone();
  const pile = loc('examples/overbuilt-picker.jsx');
  const fold = loc('examples/date.html');

  process.stdout.write('Someone asked for a date picker.\n\n');
  process.stdout.write(`The usual dump is ${pile} lines (examples/overbuilt-picker.jsx).\n`);
  process.stdout.write(`The browser already has a date box. That is ${fold} lines (examples/date.html).\n\n`);

  state = scratch.scratch(state, {
    itch: 'add a date picker',
    seed: 'try',
    surface: 'browser',
  }, t).state;
  state = scratch.doubt(state, { what: 'I have only read the JSX' }, t).state;
  state = scratch.think(state, { claim: 'use native input type date' }, t).state;

  let fromFile = false;
  try {
    scratch.settle(state, c, t);
  } catch (err) {
    if (/BLIND|spacelike|look/i.test(err.message)) fromFile = true;
    else throw err;
  }
  process.stdout.write(`1. Ship it after only reading the source file?  ${fromFile ? 'No. Never saw the page.' : 'FAIL'}\n`);

  const twitch = cone.observe(c, { id: 'try_twitch', surface: 'browser', seen: 'top of the form' }, t);
  c = twitch.cone;
  state = scratch.attachLook(state, twitch.observation).state;

  let twitchOnly = false;
  try {
    scratch.settle(state, c, t);
  } catch (err) {
    if (/UNSEEN|spacelike|bottom|Not seen|Waiting|Tap/i.test(err.message)) twitchOnly = true;
    else throw err;
  }
  process.stdout.write(`2. Glance at the top of the page?               ${twitchOnly ? 'No. That is not the whole page.' : 'FAIL'}\n`);

  const lit = cone.observe(c, {
    id: 'try_lamp',
    surface: 'browser',
    seen: 'plain text fields only',
    ...cone.pass({ delayOff: true, manualAt: t }),
  }, t);
  c = lit.cone;
  state = scratch.attachLook(state, lit.observation).state;
  const allow = cone.allow(c, 'browser', t);
  process.stdout.write(`3. Scroll to the end and confirm you saw it?    ${allow.ok ? 'Yes. Now we have seen the page.' : 'FAIL'}\n`);

  let noLib = false;
  try {
    const libState = scratch.think(state, { claim: 'install flatpickr and wrap it' }, t).state;
    scratch.settle(libState, c, t);
  } catch (err) {
    if (/native input type=date|do not add/i.test(err.message)) noLib = true;
    else throw err;
  }
  process.stdout.write(`4. Install a date-picker library anyway?        ${noLib ? 'No. The browser already has one.' : 'FAIL'}\n`);

  const r = scratch.settle(state, c, t);
  process.stdout.write(`5. Use the built-in date box?                   ${r.scratch.mate ? 'Yes.' : 'FAIL'}\n`);

  const ok = fromFile && twitchOnly && allow.ok && noLib && r.scratch.mate && pile > 80 && fold < 10;
  process.stdout.write(ok
    ? `\nDone. The ${pile}-line pile is not the product. Open examples/date.html in a browser to tap the real box.\n`
    : '\ntry failed\n');
  return ok ? 0 : 1;
}

process.exitCode = main();
