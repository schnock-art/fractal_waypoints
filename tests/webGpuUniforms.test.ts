import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { complexFromNumbers } from '../src/math/complex';
import { fromNumber } from '../src/math/doubleSingle';
import { buildRenderUniformData } from '../src/rendering/webgpu/uniforms';

describe('WebGPU viewport uniforms', () => {
  it('re-splits f64 navigation values into high and low f32 components', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    const centreRe = -0.743643887037151;
    const centreIm = 0.13182590420533;
    const scale = 1.23456789012345e-12;
    config.viewport.centre = complexFromNumbers(centreRe, centreIm);
    config.viewport.scale = fromNumber(scale);

    const uniforms = buildRenderUniformData(config, 1920, 1080);

    expect(uniforms[0]).toBe(Math.fround(centreRe));
    expect(uniforms[1]).toBe(Math.fround(centreRe - Math.fround(centreRe)));
    expect(uniforms[2]).toBe(Math.fround(centreIm));
    expect(uniforms[3]).toBe(Math.fround(centreIm - Math.fround(centreIm)));
    expect(uniforms[4]).toBe(Math.fround(scale));
    expect(uniforms[5]).toBe(Math.fround(scale - Math.fround(scale)));
    expect(uniforms[0] + uniforms[1]).toBeCloseTo(centreRe, 14);
    expect(uniforms[2] + uniforms[3]).toBeCloseTo(centreIm, 14);
    expect(new Uint32Array(uniforms.buffer)[55]).toBe(0);
  });
});
