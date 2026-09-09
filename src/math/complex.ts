import type { DoubleSingle, DoubleSingleComplex } from '../types/config';

import {
  add,
  fromNumber,
  multiply,
  multiplyByFloat,
  square,
  subtract,
} from './doubleSingle';

export function complexFromNumbers(real: number, imaginary: number): DoubleSingleComplex {
  return {
    re: fromNumber(real),
    im: fromNumber(imaginary),
  };
}

export function complexAdd(
  left: DoubleSingleComplex,
  right: DoubleSingleComplex,
): DoubleSingleComplex {
  return {
    re: add(left.re, right.re),
    im: add(left.im, right.im),
  };
}

export function complexSubtract(
  left: DoubleSingleComplex,
  right: DoubleSingleComplex,
): DoubleSingleComplex {
  return {
    re: subtract(left.re, right.re),
    im: subtract(left.im, right.im),
  };
}

export function complexMultiply(
  left: DoubleSingleComplex,
  right: DoubleSingleComplex,
): DoubleSingleComplex {
  const real = subtract(multiply(left.re, right.re), multiply(left.im, right.im));
  const imaginary = multiplyByFloat(
    add(multiply(left.re, right.im), multiply(left.im, right.re)),
    1,
  );

  return {
    re: real,
    im: imaginary,
  };
}

export function complexSquare(value: DoubleSingleComplex): DoubleSingleComplex {
  const real = subtract(square(value.re), square(value.im));
  const imaginary = multiplyByFloat(multiply(value.re, value.im), 2);

  return {
    re: real,
    im: imaginary,
  };
}

export function complexAbsSquare(value: DoubleSingleComplex): DoubleSingle {
  return add(square(value.re), square(value.im));
}
