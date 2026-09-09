import type { PaletteConfig } from '../types/config';
import type { PalettePreset } from './presets';
import { addPaletteStop, updatePaletteStopPosition } from './model';

export interface PaletteWorkspaceSummary {
  matchedPresetId: string | null;
  matchedPresetName: string;
  stopCount: number;
  isCustom: boolean;
}

export function summarizePaletteWorkspace(
  palette: PaletteConfig,
  presets: PalettePreset[],
): PaletteWorkspaceSummary {
  const matchedPreset = presets.find((preset) => isSamePaletteStructure(palette, preset.palette)) ?? null;

  return {
    matchedPresetId: matchedPreset?.id ?? null,
    matchedPresetName: matchedPreset?.name ?? 'Custom mix',
    stopCount: palette.stops.length,
    isCustom: matchedPreset === null,
  };
}

export function duplicatePaletteStop(
  palette: PaletteConfig,
  index: number,
  offset = 0.08,
): PaletteConfig {
  const source = palette.stops[index];
  if (!source) {
    return palette;
  }

  const targetPosition = Math.min(1, source.position + offset);
  const withInsertedStop = addPaletteStop(palette, targetPosition);
  const insertedIndex = withInsertedStop.stops.findIndex((stop) => Math.abs(stop.position - targetPosition) < 0.011);

  if (insertedIndex < 0) {
    return withInsertedStop;
  }

  return {
    ...withInsertedStop,
    stops: withInsertedStop.stops.map((stop, stopIndex) => (
      stopIndex === insertedIndex
        ? { ...stop, color: { ...source.color } }
        : stop
    )),
  };
}

export function nudgePaletteStop(
  palette: PaletteConfig,
  index: number,
  delta: number,
): PaletteConfig {
  const source = palette.stops[index];
  if (!source) {
    return palette;
  }

  return updatePaletteStopPosition(palette, index, source.position + delta);
}

function isSamePaletteStructure(left: PaletteConfig, right: PaletteConfig): boolean {
  return JSON.stringify({
    interpolation: left.interpolation,
    repeatMode: left.repeatMode,
    stops: left.stops,
  }) === JSON.stringify({
    interpolation: right.interpolation,
    repeatMode: right.repeatMode,
    stops: right.stops,
  });
}
