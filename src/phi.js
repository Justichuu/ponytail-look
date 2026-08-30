'use strict';

const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT5 = Math.sqrt(5);
const SECOND_MS = 1000;

function pow(n) {
  return PHI ** n;
}

function fib(n) {
  return Math.round(pow(n) / SQRT5);
}

const two = fib(3);
const hardness = fib(4);
const dwellS = Math.ceil(pow(3));
const filthLimit = Math.floor(pow(4));
const stepMargin = Math.round(pow(4));
const viewSlack = fib(6);
const dwellMs = dwellS * SECOND_MS;
const stubbleMs = dwellMs * filthLimit * two;
const ttlMs = dwellMs * hardness * filthLimit;
const endSlack = viewSlack * filthLimit * two;
const windowMs = two * ttlMs;
const explainItch = Math.floor(PHI);
const explainReally = Math.floor(pow(2));

function margin() {
  return {
    lowerMs: dwellMs,
    upperMs: ttlMs,
    steps: stepMargin,
    filth: filthLimit,
  };
}

function insideTime(dt) {
  return Number.isFinite(dt) && dt >= dwellMs && dt <= ttlMs;
}

module.exports = {
  PHI,
  SQRT5,
  SECOND_MS,
  pow,
  fib,
  hardness,
  dwellS,
  filthLimit,
  stepMargin,
  ladderRungs: stepMargin,
  dwellMs,
  stubbleMs,
  ttlMs,
  viewSlack,
  endSlack,
  windowMs,
  explainItch,
  explainReally,
  margin,
  insideTime,
};
