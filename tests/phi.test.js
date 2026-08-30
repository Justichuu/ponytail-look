'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const phi = require('../src/phi');

function binet(n) {
  return Math.round(phi.PHI ** n / phi.SQRT5);
}

function recur(n) {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return a;
}

test('two independent φ tools agree on the shadows', () => {
  assert.ok(Math.abs(phi.PHI ** 2 - (phi.PHI + 1)) < 1e-12);
  assert.ok(Math.abs(1 / phi.PHI - (phi.PHI - 1)) < 1e-12);
  for (let n = 1; n <= 12; n++) {
    assert.equal(binet(n), recur(n));
    assert.equal(phi.fib(n), binet(n));
  }
});

test('real-space error bars hold', () => {
  const m = phi.margin();
  assert.equal(phi.hardness, 3);
  assert.equal(phi.dwellMs, 5_000);
  assert.equal(phi.filthLimit, 6);
  assert.equal(phi.stepMargin, 7);
  assert.equal(phi.stubbleMs, 60_000);
  assert.equal(phi.ttlMs, 90_000);
  assert.equal(phi.viewSlack, 8);
  assert.equal(phi.endSlack, 96);
  assert.equal(phi.windowMs, 180_000);
  assert.equal(m.lowerMs, phi.dwellMs);
  assert.equal(m.upperMs, phi.ttlMs);
  assert.equal(m.steps, 7);
});
