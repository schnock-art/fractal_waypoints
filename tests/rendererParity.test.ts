import { describe, expect, it } from 'vitest';

import { mandelbrotShader } from '../src/rendering/webgpu/mandelbrotShader';

describe('renderer iteration parity', () => {
  it('uses a squared bailout threshold in the WebGPU path, matching CPU iteration', () => {
    expect(mandelbrotShader).toContain('let bailout_squared = bailout * bailout;');
    expect(mandelbrotShader).toContain('if (magnitude_squared > bailout_squared)');
  });

  it('keeps formula iteration separate from material selection through orbit metrics', () => {
    expect(mandelbrotShader).toContain('struct OrbitMetrics');
    expect(mandelbrotShader).toContain('fn iterate_formula(');
    expect(mandelbrotShader).toContain('let metrics = iterate_formula(');
  });
});
