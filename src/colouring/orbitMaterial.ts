import type {
  OrbitTrapAppearanceConfig,
  OrbitTrapMetric,
  OrbitTrapPaletteMapping,
} from '../types/config';

export const defaultOrbitTrapAppearance: OrbitTrapAppearanceConfig = {
  metric: 'nearest',
  paletteMapping: 'signal',
  exteriorMix: 1,
  interiorMix: 1,
  emission: 0,
};

export function cloneOrbitTrapAppearance(
  value: OrbitTrapAppearanceConfig = defaultOrbitTrapAppearance,
): OrbitTrapAppearanceConfig {
  return { ...value };
}

export function normalizeOrbitTrapAppearance(value: OrbitTrapAppearanceConfig | undefined): OrbitTrapAppearanceConfig {
  if (!value) {
    return cloneOrbitTrapAppearance();
  }

  return {
    metric: value.metric === 'final' ? 'final' : 'nearest',
    paletteMapping: value.paletteMapping === 'distanceBands' ? 'distanceBands' : 'signal',
    exteriorMix: clamp(value.exteriorMix, 0, 1, 1),
    interiorMix: clamp(value.interiorMix, 0, 1, 1),
    emission: clamp(value.emission, 0, 0.7, 0),
  };
}

export function getOrbitTrapMetricCode(metric: OrbitTrapMetric): number {
  return metric === 'final' ? 1 : 0;
}

export function getOrbitTrapPaletteMappingCode(mapping: OrbitTrapPaletteMapping): number {
  return mapping === 'distanceBands' ? 1 : 0;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
