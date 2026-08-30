'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { main } = require('../src/cli');

function run(dir, argv) {
  const oldOut = process.stdout.write;
  const oldErr = process.stderr.write;
  let out = '';
  let err = '';
  process.stdout.write = (s) => { out += s; return true; };
  process.stderr.write = (s) => { err += s; return true; };
  let code = 0;
  try {
    code = main(argv, dir);
  } finally {
    process.stdout.write = oldOut;
    process.stderr.write = oldErr;
  }
  return { code, out, err };
}

test('cli scratch-doubt-think-settle', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  let r = run(dir, ['scratch', '--itch', 'too many files', '--seed', 'cli1']);
  assert.equal(r.code, 0);
  assert.match(r.out, /mood=irritable/);
  r = run(dir, ['think', '--claim', 'one helper is enough']);
  assert.equal(r.code, 1);
  assert.match(r.err, /doubt/);
  r = run(dir, ['doubt', '--what', 'we already have a helper']);
  assert.equal(r.code, 0);
  r = run(dir, ['think', '--claim', 'one helper is enough']);
  assert.equal(r.code, 0);
  r = run(dir, ['settle']);
  assert.equal(r.code, 0);
  assert.match(r.out, /settled/);
});

test('cli reject repeating the itch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  run(dir, ['scratch', '--itch', 'fix the button', '--seed', 'cli2']);
  run(dir, ['doubt', '--what', 'no look yet']);
  const r = run(dir, ['think', '--claim', 'fix the button']);
  assert.equal(r.code, 1);
  assert.match(r.err, /itch/);
});

test('cli draw writes an svg of the cone', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  run(dir, ['scratch', '--itch', 'viewport', '--surface', 'unreal', '--seed', 'cli3']);
  run(dir, ['look', '--surface', 'unreal', '--seen', 'pawn at origin', '--source', 'unreal']);
  const r = run(dir, ['draw']);
  assert.equal(r.code, 0);
  const svg = fs.readFileSync(path.join(dir, 'data', 'cone.svg'), 'utf8');
  assert.match(svg, /SCRATCH/);
  assert.match(svg, /unreal/);
});

test('cli shave dumps cache and blocks the next scratch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  run(dir, ['scratch', '--itch', 'too many files', '--seed', 'cli1']);
  let r = run(dir, ['cache']);
  assert.equal(r.code, 0);
  assert.match(r.out, /crumb=/);
  r = run(dir, ['shave']);
  assert.equal(r.code, 0);
  assert.match(r.out, /shaved/);
  assert.match(r.out, /SMOOTH/);
  r = run(dir, ['scratch', '--itch', 'again', '--seed', 'cli1']);
  assert.equal(r.code, 1);
  assert.match(r.err, /smooth/);
  r = run(dir, ['cache']);
  assert.match(r.out, /bullshit: grabbed air/);
});

test('cli trim cuts one kind and leaves the rest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  run(dir, ['scratch', '--itch', 'first helper', '--seed', 'a', '--now', '1']);
  run(dir, ['look', '--surface', 'browser', '--seen', 'login form', '--ttl', '10', '--now', '1']);
  run(dir, ['cache', '--now', '50']);
  let r = run(dir, ['trim', '--kind', 'dust']);
  assert.equal(r.code, 0);
  assert.match(r.out, /trimmed/);
  assert.match(r.out, /hardness unchanged/);
  r = run(dir, ['trim']);
  assert.equal(r.code, 1);
  assert.match(r.err, /part/);
});

test('cli clean washes dust and keeps the length itchy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  run(dir, ['scratch', '--itch', 'first helper', '--seed', 'a', '--now', '1']);
  run(dir, ['look', '--surface', 'browser', '--seen', 'login form', '--ttl', '10', '--now', '1']);
  run(dir, ['cache', '--now', '50']);
  let r = run(dir, ['clean', '--now', '50']);
  assert.equal(r.code, 0);
  assert.match(r.out, /cleaned/);
  assert.match(r.out, /kept crumb=/);
  assert.match(r.out, /still itchy/);
  assert.match(r.out, /ITCHY \(growing\)/);
  r = run(dir, ['clean']);
  assert.equal(r.code, 1);
  assert.match(r.err, /itchy from growing/);
});

test('cli will not open a second line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  run(dir, ['scratch', '--itch', 'first helper', '--seed', 'a']);
  const r = run(dir, ['scratch', '--itch', 'second helper', '--seed', 'b']);
  assert.equal(r.code, 1);
  assert.match(r.err, /argument until settle/);
});

test('cli glasses and spectacles are allow', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  let r = run(dir, ['glasses']);
  assert.equal(r.code, 1);
  assert.match(r.out, /BLIND/);
  r = run(dir, ['spectacles', '--surface', 'browser']);
  assert.equal(r.code, 1);
  assert.match(r.out, /BLIND/);
  run(dir, ['look', '--surface', 'browser', '--seen', 'login form', '--bottom', '--short', '--manual', '--delay-off']);
  r = run(dir, ['spectacles', '--surface', 'browser']);
  assert.equal(r.code, 0);
  assert.match(r.out, /timelike/);
  r = run(dir, ['glasses']);
  assert.equal(r.code, 0);
  assert.match(r.out, /browser  FRESH/);
});

test('cli allow is blind then unseen then timelike', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
  let r = run(dir, ['allow', '--surface', 'browser']);
  assert.equal(r.code, 1);
  assert.match(r.out, /BLIND/);
  run(dir, ['look', '--surface', 'browser', '--seen', 'login form']);
  r = run(dir, ['allow', '--surface', 'browser']);
  assert.equal(r.code, 1);
  assert.match(r.out, /UNSEEN/);
  run(dir, ['look', '--surface', 'browser', '--seen', 'login form', '--bottom', '--short', '--manual', '--delay-off']);
  r = run(dir, ['allow', '--surface', 'browser']);
  assert.equal(r.code, 0);
  assert.match(r.out, /timelike/);
});
