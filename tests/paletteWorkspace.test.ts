import { describe, expect, it } from 'vitest';

import { defaultPalettePreset, palettePresets } from '../src/palettes/presets';
import { duplicatePaletteStop, nudgePaletteStop, summarizePaletteWorkspace } from '../src/palettes/workspace';

describe('palette workspace helpers', () => {
  it('recognizes an unchanged preset structure', () => {
    const summary = summarizePaletteWorkspace(defaultPalettePreset.palette, palettePresets);

    expect(summary.matchedPresetId).toBe(defaultPalettePreset.id);
    expect(summary.isCustom).toBe(false);
  });

  it('treats edited palettes as custom variations', () => {
    const nudged = nudgePaletteStop(defaultPalettePreset.palette, 1, 0.04);
    const summary = summarizePaletteWorkspace(nudged, palettePresets);

    expect(summary.matchedPresetId).toBeNull();
    expect(summary.isCustom).toBe(true);
  });

  it('duplicates the selected stop while preserving its colour', () => {
    const duplicated = duplicatePaletteStop(defaultPalettePreset.palette, 2);
    const matchingStops = duplicated.stops.filter(
      (stop) =>
        stop.color.r === defaultPalettePreset.palette.stops[2].color.r &&
        stop.color.g === defaultPalettePreset.palette.stops[2].color.g &&
        stop.color.b === defaultPalettePreset.palette.stops[2].color.b,
    );

    expect(duplicated.stops.length).toBe(defaultPalettePreset.palette.stops.length + 1);
    expect(matchingStops.length).toBeGreaterThanOrEqual(2);
  });
});
