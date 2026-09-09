import { describe, expect, it } from 'vitest';

import { complexAbsSquare, complexSquare, complexFromNumbers } from '../src/math/complex';
import {
  add,
  divide,
  fromNumber,
  multiply,
  subtract,
  toNumber,
} from '../src/math/doubleSingle';

describe('double-single arithmetic', () => {
  it('preserves low-order bits across large additions', () => {
    const huge = fromNumber(1e16);
    const tiny = fromNumber(1);
    const result = subtract(add(huge, tiny), huge);

    expect(toNumber(result)).toBeCloseTo(1, 12);
  });

  it('multiplies with stable precision', () => {
    const result = multiply(fromNumber(Math.PI), fromNumber(Math.E));
    expect(toNumber(result)).toBeCloseTo(Math.PI * Math.E, 12);
  });

  it('divides with a corrective refinement step', () => {
    const result = divide(fromNumber(22), fromNumber(7));
    expect(toNumber(result)).toBeCloseTo(22 / 7, 12);
  });

  it('supports complex squaring and magnitude checks', () => {
    const value = complexFromNumbers(1.25, -0.5);
    const squared = complexSquare(value);
    const magnitudeSquared = complexAbsSquare(value);

    expect(toNumber(squared.re)).toBeCloseTo(1.3125, 12);
    expect(toNumber(squared.im)).toBeCloseTo(-1.25, 12);
    expect(toNumber(magnitudeSquared)).toBeCloseTo(1.8125, 12);
  });
});
