import { describe, expect, it } from 'vitest';

import {
  computeOrbitTrapDistance,
  computeOrbitTrapExteriorMix,
  computeOrbitTrapInteriorMix,
  getColouringCode,
  getOrbitTrapScale,
  sampleOrbitTrapPaletteT,
  sampleSmoothEscapePaletteT,
} from '../src/colouring/runtime';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { iterateFormulaDetailed } from '../src/fractals/runtime';

describe('orbit trap colouring runtime', () => {
  it('exposes stable colouring codes', () => {
    expect(getColouringCode('smoothEscapeTime')).toBe(0);
    expect(getColouringCode('orbitTrap')).toBe(1);
  });

  it('measures nearer trap distances for points near the trap shapes', () => {
    const nearTrap = computeOrbitTrapDistance(0.5, 0);
    const farTrap = computeOrbitTrapDistance(1.8, 1.4);

    expect(nearTrap).toBeLessThan(farTrap);
  });

  it('normalizes trap configuration and maps it into palette space', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    config.colouring.algorithmId = 'orbitTrap';
    config.colouring.parameters.trapScale = 1.6;

    expect(getOrbitTrapScale(config)).toBe(1.6);

    const paletteT = sampleOrbitTrapPaletteT(0.12, 0.032, 1.6);
    expect(paletteT).toBeGreaterThanOrEqual(0);
    expect(paletteT).toBeLessThan(1);
  });

  it('keeps smooth escape palette sampling in range for shared blending', () => {
    const paletteT = sampleSmoothEscapePaletteT(92, 48, 0.032);

    expect(paletteT).toBeGreaterThanOrEqual(0);
    expect(paletteT).toBeLessThan(1);
  });

  it('biases orbit-trap blending toward boundary detail instead of flat exterior space', () => {
    const farExteriorMix = computeOrbitTrapExteriorMix(0.08, 0.22, 1);
    const boundaryMix = computeOrbitTrapExteriorMix(0.88, 0.22, 1);

    expect(farExteriorMix).toBeGreaterThan(0);
    expect(boundaryMix).toBeGreaterThan(farExteriorMix);
    expect(boundaryMix).toBeLessThan(1);
  });

  it('keeps interior trap accents bounded while responding to trap proximity', () => {
    const nearTrapMix = computeOrbitTrapInteriorMix(0.04, 1);
    const farTrapMix = computeOrbitTrapInteriorMix(0.65, 1);

    expect(nearTrapMix).toBeGreaterThan(farTrapMix);
    expect(farTrapMix).toBeGreaterThan(0);
    expect(nearTrapMix).toBeLessThan(1);
  });

  it('skips trap-distance work when a caller only needs escape data', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    const sample = iterateFormulaDetailed(config, -0.75, 0.1, false);

    expect(sample.escaped).toBe(true);
    expect(sample.minTrapDistance).toBe(Number.POSITIVE_INFINITY);
  });
});
