'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ours = fs.readFileSync(path.join(root, 'skills', 'ponytail', 'SKILL.md'), 'utf8');
const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');

test('one skill keeps Ponytail\'s promises', () => {
  const text = `${ours}\n${agents}`;
  assert.match(text, /Look before you\s+write/);
  assert.match(text, /Does this need to exist at all/);
  assert.match(text, /Already in this codebase/);
  assert.match(text, /Never lazy about understanding/);
  assert.match(text, /input validation at trust boundaries/);
  assert.match(text, /ONE\s+runnable check/);
  assert.match(text, /Do NOT\s+use for non-coding/);
  assert.match(text, /# ponytail:/);
  assert.match(text, /not a second ladder/i);
  assert.match(text, /Human and agent learn the same/);
  assert.match(text, /only know a look/);
  assert.match(ours, /fewest tokens/);
  assert.match(ours, /<input type="date">/);
  assert.doesNotMatch(ours, /54%/);

  const src = fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual(src, ['cli.js', 'cone.js', 'phi.js', 'scratch.js']);
  const skillDirs = fs.readdirSync(path.join(root, 'skills')).filter((n) => !n.startsWith('.'));
  assert.deepEqual(skillDirs, ['ponytail']);
  const cmds = fs.readdirSync(path.join(root, 'commands')).filter((f) => f.endsWith('.toml')).sort();
  assert.deepEqual(cmds, ['ponytail.toml']);
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
