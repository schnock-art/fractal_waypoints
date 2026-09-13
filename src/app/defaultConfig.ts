import { complexFromNumbers } from '../math/complex';
import { fromNumber } from '../math/doubleSingle';
import { clonePalette } from '../palettes/model';
import { defaultPalettePreset } from '../palettes/presets';
import { SCHEMA_VERSION, type FormulaId, type PaletteConfig, type RenderConfig } from '../types/config';

function createDefaultPalette(): PaletteConfig {
  return clonePalette(defaultPalettePreset.palette);
}

export function createDefaultRenderConfig(formulaId: FormulaId = 'mandelbrot'): RenderConfig {
  const juliaDefaults = { cReal: -0.8, cImag: 0.156 };
  const isJulia = formulaId === 'julia';
  const defaultCentre = formulaId === 'burningShip'
    ? complexFromNumbers(-0.45, -0.5)
    : formulaId === 'tricorn'
      ? complexFromNumbers(0, 0)
      : isJulia
        ? complexFromNumbers(0, 0)
        : complexFromNumbers(-0.75, 0);
  const defaultScale = formulaId === 'burningShip'
    ? 2.4
    : formulaId === 'tricorn'
      ? 2.6
      : isJulia
        ? 3
        : 2.8;

  return {
    schemaVersion: SCHEMA_VERSION,
    viewport: {
      centre: defaultCentre,
      scale: fromNumber(defaultScale),
      rotation: 0,
      aspectRatio: 16 / 9,
    },
    fractal: {
      formulaId,
      parameters: isJulia ? juliaDefaults : {},
      maxIterations: 180,
      bailout: 32,
    },
    material: {
      id: 'classic',
      parameters: {
        density: 0.032,
      },
    },
    lens: {
      exposure: 1,
      vignette: 0,
    },
    palette: createDefaultPalette(),
    quality: {
      pixelDensity: 1,
    },
  };
}
