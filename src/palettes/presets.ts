import type { PaletteConfig } from '../types/config';

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  palette: PaletteConfig;
}

function createPalette(
  stops: PaletteConfig['stops'],
  interpolation: PaletteConfig['interpolation'] = 'smooth',
  repeatMode: PaletteConfig['repeatMode'] = 'repeat',
): PaletteConfig {
  return {
    interpolation,
    repeatMode,
    offset: 0,
    scale: 1,
    stops,
  };
}

export const palettePresets: PalettePreset[] = [
  {
    id: 'electric-dawn',
    name: 'Electric Dawn',
    description: 'Cool blues with warm edge flares for classic escape-time views.',
    palette: createPalette([
      { position: 0, color: { r: 0.03, g: 0.05, b: 0.16, a: 1 } },
      { position: 0.2, color: { r: 0.12, g: 0.34, b: 0.72, a: 1 } },
      { position: 0.48, color: { r: 0.23, g: 0.78, b: 0.84, a: 1 } },
      { position: 0.72, color: { r: 0.98, g: 0.76, b: 0.31, a: 1 } },
      { position: 1, color: { r: 0.98, g: 0.32, b: 0.23, a: 1 } },
    ]),
  },
  {
    id: 'ember-night',
    name: 'Ember Night',
    description: 'Deep midnight shadows with ember oranges and pale golds.',
    palette: createPalette([
      { position: 0, color: { r: 0.01, g: 0.02, b: 0.08, a: 1 } },
      { position: 0.18, color: { r: 0.2, g: 0.08, b: 0.2, a: 1 } },
      { position: 0.42, color: { r: 0.55, g: 0.16, b: 0.08, a: 1 } },
      { position: 0.75, color: { r: 0.95, g: 0.47, b: 0.13, a: 1 } },
      { position: 1, color: { r: 0.99, g: 0.9, b: 0.55, a: 1 } },
    ], 'smooth', 'repeat'),
  },
  {
    id: 'glacier-ink',
    name: 'Glacier Ink',
    description: 'High-contrast cyan and violet bands for dramatic contours.',
    palette: createPalette([
      { position: 0, color: { r: 0.02, g: 0.03, b: 0.07, a: 1 } },
      { position: 0.24, color: { r: 0.09, g: 0.25, b: 0.45, a: 1 } },
      { position: 0.5, color: { r: 0.42, g: 0.89, b: 0.96, a: 1 } },
      { position: 0.74, color: { r: 0.47, g: 0.39, b: 0.9, a: 1 } },
      { position: 1, color: { r: 0.95, g: 0.93, b: 1, a: 1 } },
    ], 'cubic', 'repeat'),
  },
];

export const defaultPalettePreset = palettePresets[0];
