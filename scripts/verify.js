#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sibling = process.env.PONYTAIL_DIR
  ? path.resolve(process.env.PONYTAIL_DIR)
  : path.resolve(root, '..', 'ponytail');

function run(cwd, args) {
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function ensurePonytail() {
  const pkg = path.join(sibling, 'package.json');
  if (fs.existsSync(pkg)) return sibling;
  fs.mkdirSync(path.dirname(sibling), { recursive: true });
  const clone = spawnSync('git', [
    'clone', '--depth', '1',
    'https://github.com/DietrichGebert/ponytail.git',
    sibling,
  ], { encoding: 'utf8' });
  if (clone.status !== 0) {
    throw new Error(clone.stderr || clone.stdout || 'clone failed');
  }
  return sibling;
}

function main() {
  const lines = [];
  const self = run(root, ['--test', ...fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.js')).map((f) => path.join('tests', f))]);
  lines.push(self.code === 0
    ? 'This pack\'s tests passed.'
    : 'This pack\'s tests failed.');
  if (self.code !== 0) lines.push(self.out.slice(-800));

  let ponyDir = sibling;
  try {
    ponyDir = ensurePonytail();
  } catch (err) {
    lines.push(`Could not load Ponytail (${err.message}).`);
    process.stdout.write(lines.join('\n') + '\n');
    process.exitCode = 1;
    return;
  }

  const pony = run(ponyDir, ['--test', path.join('tests', 'behavior.test.js')]);
  const rel = path.relative(root, ponyDir) || '.';
  lines.push(pony.code === 0
    ? `Ponytail's own tests passed (${rel}).`
    : `Ponytail's own tests failed (${rel}).`);
  if (pony.code !== 0) lines.push(pony.out.slice(-800));

  const skill = fs.readFileSync(path.join(ponyDir, 'skills', 'ponytail', 'SKILL.md'), 'utf8');
  const ours = fs.readFileSync(path.join(root, '.cursor', 'skills', 'ponytail', 'SKILL.md'), 'utf8');
  const world = fs.readFileSync(path.join(root, 'src', 'cone.js'), 'utf8');
  const hole = /input type="date"/.test(skill) && /date picker/.test(world);
  lines.push(hole
    ? 'Date picker is still their example: native <input type="date">, not a library.'
    : 'Date picker example is missing or drifted.');
  const promises = [
    /reuse it\.\s*Grep/i,
    /Does this need to exist at all/,
    /Already in this codebase/,
    /Never lazy about understanding/,
    /input validation at trust boundaries/,
    /ONE\s+runnable check/,
    /Do NOT\s+use for non-coding/,
    /# ponytail:/,
  ];
  const aligned = promises.every((re) => re.test(ours));
  lines.push(aligned
    ? 'This skill still keeps Ponytail\'s promises. Same ladder, with the spectacles on.'
    : 'This skill drifted away from Ponytail\'s promises.');

  const text = lines.join('\n') + '\n';
  process.stdout.write(text);
  const outDir = path.join(root, 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'verify.txt'), text);
  process.exitCode = self.code === 0 && pony.code === 0 && hole && aligned ? 0 : 1;
}

main();
