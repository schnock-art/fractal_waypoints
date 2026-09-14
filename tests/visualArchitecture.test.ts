import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { getMaterialCompatibility, materialRegistry, validateMaterialConfig } from '../src/visuals/materials/registry';
import { createLensConfig, getLensEffectAmount, normalizeLensConfig, updateLensEffect, validateLensConfig } from '../src/visuals/lenses/model';
import { applyModulations, evaluateModulation } from '../src/visuals/modulation/runtime';
import { formulaRegistry } from '../src/fractals/registry';

describe('visual architecture contracts', () => {
  it('advertises concrete reusable metrics for every current formula', () => {
    for (const formula of Object.values(formulaRegistry)) {
      expect(formula.supportedMetrics).toContain('smoothIteration');
      expect(formula.supportedMetrics).toContain('finalComplex');
      expect(formula.supportedMetrics).toContain('complexPhase');
    }
    expect(getMaterialCompatibility('mandelbrot', 'orbitTrap')).toEqual({ compatible: true, missing: [] });
    expect(materialRegistry.orbitTrap.sampling).toBe('point');
    expect(materialRegistry.topographic.sampling).toBe('neighbourhood');
    expect(materialRegistry.surface.sampling).toBe('neighbourhood');
    expect(materialRegistry.domainColouring.requiredMetrics).toContain('complexPhase');
    expect(materialRegistry.surface.cpuSupport).toBe('approximate');
  });

  it('validates material parameter boundaries instead of relying on UI conditionals', () => {
    const invalid = { id: 'orbitTrap', parameters: { density: -1, trapScale: 0 } } as const;
    expect(validateMaterialConfig(invalid)).toHaveLength(3);
    expect(validateMaterialConfig({ id: 'topographic', parameters: { contourLevels: 1, contourWidth: 0 } })).not.toEqual([]);
    expect(validateMaterialConfig({ id: 'surface', parameters: { height: 0, specular: 1.5 } })).not.toEqual([]);
  });

  it('migrates and orders composable lens effects', () => {
    const lens = updateLensEffect(createLensConfig(), 'vignette', { amount: 0.4 }, true);
    expect(getLensEffectAmount(lens, 'vignette')).toBe(0.4);
    const normalized = normalizeLensConfig({ effects: [{ id: 'exposure', enabled: true, parameters: { amount: 8 } }] });
    expect(normalized.effects.find((effect) => effect.id === 'exposure')).toEqual({ id: 'exposure', enabled: true, parameters: { amount: 1.8 } });
    expect(normalized.effects.find((effect) => effect.id === 'toneMapping')).toEqual({ id: 'toneMapping', enabled: true, parameters: { amount: 1 } });
    expect(normalized.effects.find((effect) => effect.id === 'bloom')).toEqual({ id: 'bloom', enabled: false, parameters: { amount: 0, threshold: 1.1 } });
    expect(validateLensConfig(lens)).toEqual([]);
  });

  it('applies deterministic modulation after its base configuration', () => {
    const config = createDefaultRenderConfig();
    config.palette.offset = 0.25;
    config.modulations = [{
      id: 'palette-cycle', target: 'palette.offset', waveform: 'sine', amplitude: 0.2, frequencyHz: 0.5, phase: 0, offset: 0, enabled: true,
    }];

    expect(evaluateModulation(config.modulations[0], 0.5)).toBeCloseTo(0.2, 8);
    expect(applyModulations(config, 0.5).palette.offset).toBeCloseTo(0.45, 8);
    expect(applyModulations(config, 0.5)).toEqual(applyModulations(config, 0.5));
  });
});
