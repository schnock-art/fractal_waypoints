import { describe, expect, it } from 'vitest';

import {
  addPaletteStop,
  hexToRgba,
  paletteToCssGradient,
  removePaletteStop,
  reversePalette,
  rgbaToHex,
  updatePaletteStopPosition,
  validatePalette,
} from '../src/palettes/model';
import { defaultPalettePreset } from '../src/palettes/presets';
import { buildPaletteLut, samplePalette } from '../src/palettes/sampler';

describe('palette model', () => {
  it('validates palettes with too few stops', () => {
    const issues = validatePalette({
      ...defaultPalettePreset.palette,
      stops: [defaultPalettePreset.palette.stops[0]],
    });

    expect(issues.some((issue) => issue.message.includes('at least two'))).toBe(true);
  });

  it('adds and removes palette stops while keeping ordering intact', () => {
    const withStop = addPaletteStop(defaultPalettePreset.palette, 0.33);
    const withoutStop = removePaletteStop(withStop, 1);

    expect(withStop.stops.length).toBe(defaultPalettePreset.palette.stops.length + 1);
    expect(withStop.stops.every((stop, index, stops) => index === 0 || stops[index - 1].position <= stop.position)).toBe(true);
    expect(withoutStop.stops.length).toBe(withStop.stops.length - 1);
  });

  it('updates stop positions and reverses palettes deterministically', () => {
    const moved = updatePaletteStopPosition(defaultPalettePreset.palette, 1, 0.66);
    const reversed = reversePalette(moved);

    expect(moved.stops.some((stop) => stop.position >= 0.66 && stop.position < 0.67)).toBe(true);
    expect(reversed.stops[0].position).toBe(0);
    expect(reversed.stops[reversed.stops.length - 1].position).toBe(1);
  });

  it('converts palette colors between hex and rgba', () => {
    const hex = rgbaToHex({ r: 1, g: 0.5, b: 0, a: 1 });
    const rgba = hexToRgba('#ff8000');

    expect(hex).toBe('#ff8000');
    expect(rgba.r).toBeCloseTo(1, 12);
    expect(rgba.g).toBeCloseTo(128 / 255, 12);
  });

  it('supports three-digit hex color input normalization through conversion', () => {
    const rgba = hexToRgba('#f80');
    expect(rgba.r).toBeCloseTo(1, 12);
    expect(rgba.g).toBeCloseTo(136 / 255, 12);
    expect(rgba.b).toBeCloseTo(0, 12);
  });

  it('builds a css gradient preview string', () => {
    const css = paletteToCssGradient(defaultPalettePreset.palette);
    expect(css.startsWith('linear-gradient')).toBe(true);
  });
});

describe('palette sampling', () => {
  it('supports repeat and mirror behaviour through the LUT path', () => {
    const repeated = samplePalette(defaultPalettePreset.palette, 1.25);
    const mirrored = samplePalette(
      {
        ...defaultPalettePreset.palette,
        repeatMode: 'mirror',
      },
      1.25,
    );

    expect(repeated.a).toBeCloseTo(1, 12);
    expect(mirrored.a).toBeCloseTo(1, 12);
  });

  it('builds a complete lookup table', () => {
    const lut = buildPaletteLut(defaultPalettePreset.palette, 32);
    expect(lut).toHaveLength(128);
  });
});
