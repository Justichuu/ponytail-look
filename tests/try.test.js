'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('npm run try is the one check you can run yourself', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'try.js')], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /Never saw the page/);
  assert.match(r.stdout, /not the whole page/);
  assert.match(r.stdout, /seen the page/);
  assert.match(r.stdout, /already has one/);
  assert.match(r.stdout, /Use the built-in date box\? +Yes/);
  assert.match(r.stdout, /overbuilt-picker/);
  assert.match(r.stdout, /date\.html/);
});
