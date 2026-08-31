'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ours = fs.readFileSync(path.join(root, 'skills', 'ponytail', 'SKILL.md'), 'utf8');
const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const rule = fs.readFileSync(path.join(root, '.cursor', 'rules', 'ponytail.mdc'), 'utf8');
const cmd = fs.readFileSync(path.join(root, 'commands', 'ponytail.toml'), 'utf8');

test('one skill keeps Ponytail\'s promises', () => {
  assert.match(ours, /reuse it\.\s*Grep/i);
  assert.match(ours, /Does this need to exist at all/);
  assert.match(ours, /Already in this codebase/);
  assert.match(ours, /Never lazy about understanding/);
  assert.match(ours, /input validation at trust boundaries/);
  assert.match(ours, /ONE\s+runnable check/);
  assert.match(ours, /Do NOT\s+use for non-coding/);
  assert.match(ours, /# ponytail:/);
  assert.match(ours, /not a second ladder/i);
  assert.match(ours, /Human and agent learn\s+the same/);
  assert.match(ours, /only know what the spectacles saw/);
  assert.match(ours, /fewest tokens/);
  assert.match(ours, /<input type="date">/);
  assert.doesNotMatch(ours, /54%/);
  assert.doesNotMatch(ours, /\blook\b/i);

  const src = fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual(src, ['cli.js', 'cone.js', 'phi.js', 'scratch.js']);
  const skillDirs = fs.readdirSync(path.join(root, 'skills')).filter((n) => !n.startsWith('.'));
  assert.deepEqual(skillDirs, ['ponytail']);
  const cmds = fs.readdirSync(path.join(root, 'commands')).filter((f) => f.endsWith('.toml')).sort();
  assert.deepEqual(cmds, ['ponytail.toml']);
  assert.equal(fs.existsSync(path.join(root, 'patches')), false);
  const swap = fs.readdirSync(path.join(root, '.cursor', 'skills', 'swap')).sort();
  assert.deepEqual(swap, ['SKILL.md', 'swap.js']);
});

test('adapters follow the skill instead of copying it', () => {
  for (const text of [agents, rule, cmd]) {
    assert.match(text, /skills\/ponytail\/SKILL\.md/);
    assert.doesNotMatch(text, /Does this need to exist at all/);
    assert.doesNotMatch(text, /<input type="date">/);
  }
});

test('Ponytail still holds the same promises', () => {
  const pony = path.join(root, '..', 'ponytail', 'skills', 'ponytail', 'SKILL.md');
  if (!fs.existsSync(pony)) {
    assert.ok(true, 'ponytail sibling missing — verify clones it');
    return;
  }
  const skill = fs.readFileSync(pony, 'utf8');
  assert.match(skill, /Look before you\s+write/);
  assert.match(skill, /<input type="date">/);
  assert.match(skill, /Never lazy about understanding/);
  assert.match(skill, /input validation at trust boundaries/);
  assert.match(skill, /Do NOT\s+use for non-coding/);
});
