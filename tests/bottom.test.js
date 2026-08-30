'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { atBottom, canScroll, reachedEnd, END_SLACK } = require('../src/cone');

test('short page is already at the end', () => {
  assert.equal(canScroll({ top: 0, view: 700, height: 700 }), false);
  assert.equal(atBottom({ top: 0, view: 700, height: 700 }), true);
});

test('first twitch on a long page is not the bottom', () => {
  assert.equal(atBottom({ top: 12, view: 700, height: 2400 }), false);
});

test('iPhone chrome: near the end still counts', () => {
  const view = 640;
  const height = 2400;
  const top = height - view - (END_SLACK - 8);
  assert.equal(atBottom({ top, view, height }), true);
});

test('iPhone: window.scrollY stays 0 while an inner box is at the end', () => {
  const windowBox = { top: 0, view: 640, height: 2400 };
  const inner = { top: 1700, view: 640, height: 2400 };
  assert.equal(atBottom(windowBox), false);
  const end = reachedEnd([windowBox, inner]);
  assert.equal(end.bottom, true);
  assert.equal(end.short, false);
});

test('no scroller that actually moves is a short page', () => {
  const end = reachedEnd([{ top: 0, view: 800, height: 802 }]);
  assert.equal(end.short, true);
  assert.equal(end.bottom, true);
});
