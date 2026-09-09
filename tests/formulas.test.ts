import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { formulaRegistry } from '../src/fractals/registry';
import { getFormulaCode, iterateFormulaSample } from '../src/fractals/runtime';
import { runDiscoveryScan } from '../src/navigation/discovery';

describe('formula registry expansion', () => {
  it('exposes the new advanced formulas', () => {
    expect(formulaRegistry.burningShip.displayName).toBe('Burning Ship');
    expect(formulaRegistry.tricorn.displayName).toBe('Tricorn');
    expect(getFormulaCode('mandelbrot')).toBe(0);
    expect(getFormulaCode('julia')).toBe(1);
    expect(getFormulaCode('burningShip')).toBe(2);
    expect(getFormulaCode('tricorn')).toBe(3);
  });

  it('provides stable default viewports for the new formulas', () => {
    expect(createDefaultRenderConfig('burningShip').fractal.formulaId).toBe('burningShip');
    expect(createDefaultRenderConfig('tricorn').fractal.formulaId).toBe('tricorn');
    expect(createDefaultRenderConfig('burningShip').fractal.parameters).toEqual({});
  });
});

describe('formula sampling', () => {
  it('keeps origin bounded for the supported non-julia formulas', () => {
    for (const formulaId of ['mandelbrot', 'burningShip', 'tricorn'] as const) {
      const config = createDefaultRenderConfig(formulaId);
      const sample = iterateFormulaSample(config, 0, 0);
      expect(sample.escaped).toBe(false);
      expect(sample.normalizedIterations).toBe(1);
    }
  });

  it('supports discovery scans on the new formulas', () => {
    for (const formulaId of ['burningShip', 'tricorn'] as const) {
      const run = runDiscoveryScan(createDefaultRenderConfig(formulaId), {
        levels: 2,
        beamWidth: 3,
        samplesPerAxis: 5,
        maxResults: 3,
      });

      expect(run.waypoints.length).toBeGreaterThan(0);
      expect(run.waypoints.every((waypoint) => waypoint.renderConfig.fractal.formulaId === formulaId)).toBe(true);
    }
  });
});
