import { describe, expect, it } from 'vitest';

import {
  computeOrbitTrapDistance,
  computeOrbitTrapExteriorMix,
  computeOrbitTrapInteriorMix,
  applyOrbitTrapEmission,
  applyLens,
  getMaterialCode,
  getOrbitTrapAppearance,
  getOrbitTrapScale,
  sampleOrbitTrapPaletteT,
  sampleSmoothEscapePaletteT,
} from '../src/colouring/runtime';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { createOrbitTrap, defaultOrbitTrapSet } from '../src/colouring/orbitTraps';
import { iterateFormulaDetailed } from '../src/fractals/runtime';

describe('orbit trap material runtime', () => {
  it('exposes stable material codes', () => {
    expect(getMaterialCode('classic')).toBe(0);
    expect(getMaterialCode('orbitTrap')).toBe(1);
  });

  it('measures nearer trap distances for points near the trap shapes', () => {
    const nearTrap = computeOrbitTrapDistance(0.5, 0);
    const farTrap = computeOrbitTrapDistance(1.8, 1.4);

    expect(nearTrap).toBeLessThan(farTrap);
  });

  it('supports transformed point, line, circle, cross, and spiral SDF traps', () => {
    const shapes = ['point', 'line', 'circle', 'cross', 'spiral'] as const;

    for (const shape of shapes) {
      const trap = createOrbitTrap(shape);
      trap.x = 0.2;
      trap.y = -0.1;
      trap.rotation = 0.4;
      trap.scale = 0.7;
      const near = computeOrbitTrapDistance(0.2, -0.1, { composition: 'minimum', traps: [trap] });
      const far = computeOrbitTrapDistance(1.8, 1.4, { composition: 'minimum', traps: [trap] });

      expect(near).toBeLessThan(far);
    }
  });

  it('preserves the legacy circle-and-cross trap as the default composed set', () => {
    const nearCircle = computeOrbitTrapDistance(0.5, 0, defaultOrbitTrapSet);
    const nearCross = computeOrbitTrapDistance(0, 0.8, defaultOrbitTrapSet);

    expect(nearCircle).toBeCloseTo(0, 8);
    expect(nearCross).toBeCloseTo(0, 8);
  });

  it('normalizes trap configuration and maps it into palette space', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    config.material.id = 'orbitTrap';
    config.material.parameters.trapScale = 1.6;

    expect(getOrbitTrapScale(config)).toBe(1.6);

    const paletteT = sampleOrbitTrapPaletteT(0.12, 0.032, 1.6);
    expect(paletteT).toBeGreaterThanOrEqual(0);
    expect(paletteT).toBeLessThan(1);
  });

  it('supports metric, palette mapping, blend strength, and emissive appearance controls', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    config.material.id = 'orbitTrap';
    config.material.orbitAppearance = {
      metric: 'final',
      paletteMapping: 'distanceBands',
      exteriorMix: 0.4,
      interiorMix: 0.3,
      emission: 0.5,
    };

    expect(getOrbitTrapAppearance(config)).toEqual(config.material.orbitAppearance);
    expect(sampleOrbitTrapPaletteT(0.22, 0.032, 1, 'distanceBands'))
      .not.toBe(sampleOrbitTrapPaletteT(0.22, 0.032, 1, 'signal'));
    expect(computeOrbitTrapExteriorMix(0.8, 0.12, 1, 0.4))
      .toBeLessThan(computeOrbitTrapExteriorMix(0.8, 0.12, 1, 1));
    expect(computeOrbitTrapInteriorMix(0.12, 1, 0.3))
      .toBeLessThan(computeOrbitTrapInteriorMix(0.12, 1, 1));
    expect(applyOrbitTrapEmission(
      { r: 0.1, g: 0.1, b: 0.1, a: 1 },
      { r: 0.8, g: 0.4, b: 0.2, a: 1 },
      0.04,
      1,
      0.5,
    ).r).toBeGreaterThan(0.1);
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
    expect(sample.finalTrapDistance).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns reusable orbit metrics alongside escape state', () => {
    const sample = iterateFormulaDetailed(createDefaultRenderConfig('mandelbrot'), -0.75, 0.1, true);

    expect(sample.finalReal).toBeTypeOf('number');
    expect(sample.finalImaginary).toBeTypeOf('number');
    expect(sample.smoothIteration).toBeTypeOf('number');
    expect(Number.isFinite(sample.smoothIteration)).toBe(true);
    expect(Number.isFinite(sample.finalTrapDistance)).toBe(true);
  });

  it('applies exposure and a centred vignette as a presentation-only lens treatment', () => {
    const color = { r: 0.4, g: 0.2, b: 0.1, a: 1 };
    const centre = applyLens(color, { exposure: 1.5, vignette: 0.6 }, 0.5, 0.5);
    const corner = applyLens(color, { exposure: 1.5, vignette: 0.6 }, 1, 1);

    expect(centre.r).toBeCloseTo(0.6, 6);
    expect(corner.r).toBeLessThan(centre.r);
  });
});
