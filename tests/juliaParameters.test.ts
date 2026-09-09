import { describe, expect, it } from 'vitest';

import { applyJuliaParameterAction } from '../src/navigation/juliaParameters';

describe('Julia parameter keyboard actions', () => {
  it('adjusts real and imaginary parameters in both directions', () => {
    const parameters = { cReal: -0.8, cImag: 0.156 };

    expect(applyJuliaParameterAction(parameters, 'juliaRealDecrease', false).cReal).toBeCloseTo(-0.801);
    expect(applyJuliaParameterAction(parameters, 'juliaRealIncrease', false).cReal).toBeCloseTo(-0.799);
    expect(applyJuliaParameterAction(parameters, 'juliaImaginaryIncrease', false).cImag).toBeCloseTo(0.157);
    expect(applyJuliaParameterAction(parameters, 'juliaImaginaryDecrease', false).cImag).toBeCloseTo(0.155);
  });

  it('uses the smaller step in precision mode', () => {
    const parameters = { cReal: -0.8, cImag: 0.156 };

    expect(applyJuliaParameterAction(parameters, 'juliaRealDecrease', true).cReal).toBeCloseTo(-0.8001);
    expect(applyJuliaParameterAction(parameters, 'juliaImaginaryIncrease', true).cImag).toBeCloseTo(0.1561);
  });

  it('ignores navigation actions unrelated to Julia parameters', () => {
    const parameters = { cReal: -0.8, cImag: 0.156 };

    expect(applyJuliaParameterAction(parameters, 'moveLeft', false)).toBe(parameters);
  });
});
