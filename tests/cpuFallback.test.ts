import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { sampleOrbitTrapPaletteT, sampleSmoothEscapePaletteT } from '../src/colouring/runtime';
import { iterateFormulaDetailed } from '../src/fractals/runtime';
import { samplePalette } from '../src/palettes/sampler';
import { getCpuRenderSize, sampleCpuPixelColor } from '../src/rendering/fallback/CpuRenderCoordinator';

describe('cpu fallback renderer', () => {
  it('returns an interior shade for bounded smooth-escape samples', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    const color = sampleCpuPixelColor(config, 0, 0);

    expect(color.r).toBeCloseTo(0.02, 6);
    expect(color.g).toBeCloseTo(0.03, 6);
    expect(color.b).toBeCloseTo(0.06, 6);
  });

  it('returns palette-driven color for orbit-trap shading', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    config.material.id = 'orbitTrap';
    config.material.parameters.trapScale = 1;

    const color = sampleCpuPixelColor(config, -0.75, 0.1);

    expect(color.a).toBe(1);
    expect(color.r + color.g + color.b).toBeGreaterThan(0.1);
  });

  it('keeps far exterior orbit-trap shading anchored to the smooth escape structure', () => {
    const smoothConfig = createDefaultRenderConfig('mandelbrot');
    const orbitConfig = createDefaultRenderConfig('mandelbrot');
    orbitConfig.material.id = 'orbitTrap';
    orbitConfig.material.parameters.trapScale = 1;

    const real = 1.8;
    const imaginary = 1.1;
    const density = smoothConfig.material.parameters.density ?? 0.032;
    const sample = iterateFormulaDetailed(smoothConfig, real, imaginary);
    const orbitColor = sampleCpuPixelColor(orbitConfig, real, imaginary);
    const smoothColor = samplePalette(
      smoothConfig.palette,
      sampleSmoothEscapePaletteT(sample.iteration, sample.magnitudeSquared, density),
    );
    const trapColor = samplePalette(
      smoothConfig.palette,
      sampleOrbitTrapPaletteT(sample.minTrapDistance, density, 1),
    );

    expect(colorDistance(orbitColor, smoothColor)).toBeLessThan(colorDistance(trapColor, smoothColor));
  });

  it('adds a stronger trap accent near the boundary than in open exterior space', () => {
    const smoothConfig = createDefaultRenderConfig('mandelbrot');
    const orbitConfig = createDefaultRenderConfig('mandelbrot');
    orbitConfig.material.id = 'orbitTrap';
    orbitConfig.material.parameters.trapScale = 1;

    const boundaryPoint = { real: -0.75, imaginary: 0.1 };
    const farExteriorPoint = { real: 1.8, imaginary: 1.1 };

    const boundaryDelta = colorDistance(
      sampleCpuPixelColor(orbitConfig, boundaryPoint.real, boundaryPoint.imaginary),
      sampleCpuPixelColor(smoothConfig, boundaryPoint.real, boundaryPoint.imaginary),
    );
    const farExteriorDelta = colorDistance(
      sampleCpuPixelColor(orbitConfig, farExteriorPoint.real, farExteriorPoint.imaginary),
      sampleCpuPixelColor(smoothConfig, farExteriorPoint.real, farExteriorPoint.imaginary),
    );

    expect(boundaryDelta).toBeGreaterThan(farExteriorDelta);
  });

  it('honours serialised orbit-trap appearance controls in the CPU fallback', () => {
    const smoothConfig = createDefaultRenderConfig('mandelbrot');
    const orbitConfig = createDefaultRenderConfig('mandelbrot');
    orbitConfig.material.id = 'orbitTrap';
    orbitConfig.material.orbitAppearance = {
      metric: 'final',
      paletteMapping: 'distanceBands',
      exteriorMix: 0,
      interiorMix: 0,
      emission: 0,
    };

    const point = { real: 1.8, imaginary: 1.1 };
    expect(sampleCpuPixelColor(orbitConfig, point.real, point.imaginary))
      .toEqual(sampleCpuPixelColor(smoothConfig, point.real, point.imaginary));
  });

  it('caps fallback resolution to keep high-DPI renders responsive', () => {
    const size = getCpuRenderSize(2560, 1440);

    expect(size.width * size.height).toBeLessThanOrEqual(240_000);
    expect(size.width / size.height).toBeCloseTo(2560 / 1440, 2);
  });
});

function colorDistance(
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number },
): number {
  return Math.hypot(
    left.r - right.r,
    left.g - right.g,
    left.b - right.b,
  );
}
