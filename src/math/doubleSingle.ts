import type { DoubleSingle } from '../types/config';

const SPLITTER = 134_217_729;

export const ZERO_DS: DoubleSingle = { hi: 0, lo: 0 };
export const ONE_DS: DoubleSingle = { hi: 1, lo: 0 };

export function fromNumber(value: number): DoubleSingle {
  return { hi: value, lo: 0 };
}

export function toNumber(value: DoubleSingle): number {
  return value.hi + value.lo;
}

export function normalize(value: DoubleSingle): DoubleSingle {
  const [hi, lo] = quickTwoSum(value.hi, value.lo);
  return { hi, lo };
}

export function negate(value: DoubleSingle): DoubleSingle {
  return { hi: -value.hi, lo: -value.lo };
}

export function add(left: DoubleSingle, right: DoubleSingle): DoubleSingle {
  const [sum, error] = twoSum(left.hi, right.hi);
  return normalize({
    hi: sum,
    lo: error + left.lo + right.lo,
  });
}

export function subtract(left: DoubleSingle, right: DoubleSingle): DoubleSingle {
  return add(left, negate(right));
}

export function multiply(left: DoubleSingle, right: DoubleSingle): DoubleSingle {
  const [product, error] = twoProduct(left.hi, right.hi);
  return normalize({
    hi: product,
    lo: error + (left.hi * right.lo) + (left.lo * right.hi) + (left.lo * right.lo),
  });
}

export function multiplyByFloat(value: DoubleSingle, factor: number): DoubleSingle {
  const [product, error] = twoProduct(value.hi, factor);
  return normalize({
    hi: product,
    lo: error + (value.lo * factor),
  });
}

export function divide(dividend: DoubleSingle, divisor: DoubleSingle): DoubleSingle {
  const q1 = dividend.hi / divisor.hi;
  const q1ds = fromNumber(q1);
  const remainder = subtract(dividend, multiply(divisor, q1ds));
  const q2 = toNumber(remainder) / divisor.hi;
  return add(q1ds, fromNumber(q2));
}

export function square(value: DoubleSingle): DoubleSingle {
  return multiply(value, value);
}

function quickTwoSum(left: number, right: number): [number, number] {
  const sum = left + right;
  return [sum, right - (sum - left)];
}

function twoSum(left: number, right: number): [number, number] {
  const sum = left + right;
  const virtual = sum - left;
  const error = (left - (sum - virtual)) + (right - virtual);
  return [sum, error];
}

function split(value: number): [number, number] {
  const scaled = SPLITTER * value;
  const hi = scaled - (scaled - value);
  const lo = value - hi;
  return [hi, lo];
}

function twoProduct(left: number, right: number): [number, number] {
  const product = left * right;
  const [leftHi, leftLo] = split(left);
  const [rightHi, rightLo] = split(right);
  const error =
    ((leftHi * rightHi - product) + (leftHi * rightLo) + (leftLo * rightHi)) +
    (leftLo * rightLo);
  return [product, error];
}
