#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const skill = fs.readFileSync(path.join(__dirname, '..', '.cursor', 'skills', 'ponytail', 'SKILL.md'), 'utf8');
process.stdout.write(skill.replace(/^---[\s\S]*?---\s*/, '').trim() + '\n');
