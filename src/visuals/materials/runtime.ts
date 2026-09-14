import type { LensConfig, MaterialId, OrbitTrapAppearanceConfig, OrbitTrapSetConfig, RenderConfig, RgbaColor } from '../../types/config';
import { normalizeOrbitTrapAppearance } from '../traps/orbitMaterial';
import { getLensEffectAmount } from '../lenses/model';
import { normalizeOrbitTrapSet } from '../traps/orbitTraps';

export function getMaterialCode(materialId: MaterialId): number {
  switch (materialId) {
    case 'rootBasin': return 5;
    case 'convergenceSpeed': return 6;
    case 'classic':
      return 0;
    case 'orbitTrap':
      return 1;
    case 'topographic':
      return 2;
    case 'domainColouring':
      return 3;
    case 'surface':
      return 4;
    default:
      return 0;
  }
}

export function getMaterialDensity(config: RenderConfig): number {
  return config.material.parameters.density ?? 0.032;
}

export function getOrbitTrapScale(config: RenderConfig): number {
  return config.material.parameters.trapScale ?? 1;
}

export function getOrbitTrapSet(config: RenderConfig): OrbitTrapSetConfig {
  return normalizeOrbitTrapSet(config.material.orbitTraps);
}

export function getOrbitTrapAppearance(config: RenderConfig): OrbitTrapAppearanceConfig {
  return normalizeOrbitTrapAppearance(config.material.orbitAppearance);
}

export function sampleSmoothEscapePaletteT(iteration: number, magnitudeSquared: number, density: number): number {
  const smoothIteration = iteration + 1 - Math.log2(Math.log2(Math.max(Math.sqrt(magnitudeSquared), 1.0001)));
  return fract(smoothIteration * getSafeDensity(density));
}

export function sampleOrbitTrapPaletteT(
  trapDistance: number,
  density: number,
  trapScale: number,
  paletteMapping: OrbitTrapAppearanceConfig['paletteMapping'] = 'signal',
): number {
  if (paletteMapping === 'distanceBands') {
    return fract(Math.max(trapDistance, 0) * Math.max(trapScale, 0.05) * (12 + (getSafeDensity(density) * 80)));
  }

  return fract(computeOrbitTrapSignal(trapDistance, trapScale) * getSafeDensity(density) * 24);
}

export function computeOrbitTrapDistance(
  real: number,
  imaginary: number,
  trapSet?: OrbitTrapSetConfig,
): number {
  const normalized = normalizeOrbitTrapSet(trapSet);
  const distances = normalized.traps.map((trap) => computeSdfDistance(real, imaginary, trap));
  return normalized.composition === 'maximum'
    ? Math.max(...distances)
    : Math.min(...distances);
}

export function computeOrbitTrapSignal(minTrapDistance: number, trapScale: number): number {
  const safeScale = Math.max(trapScale, 0.05);
  return 1 / (1 + (Math.max(minTrapDistance, 0) * safeScale * 12));
}

export function computeOrbitTrapExteriorMix(
  normalizedIterations: number,
  trapDistance: number,
  trapScale: number,
  strength = 1,
): number {
  const boundaryBias = clampUnit(normalizedIterations);
  const trapBias = computeOrbitTrapSignal(trapDistance, trapScale);
  return clampUnit((0.18 + (boundaryBias * 0.3) + (trapBias * 0.18)) * clampUnit(strength));
}

export function computeOrbitTrapInteriorMix(trapDistance: number, trapScale: number, strength = 1): number {
  return clampUnit((0.22 + (computeOrbitTrapSignal(trapDistance, trapScale) * 0.42)) * clampUnit(strength));
}

export function applyOrbitTrapEmission(
  base: RgbaColor,
  accent: RgbaColor,
  trapDistance: number,
  trapScale: number,
  intensity: number,
): RgbaColor {
  const emission = computeOrbitTrapSignal(trapDistance, trapScale) * clampUnit(intensity) * 0.55;
  return {
    r: clampUnit(base.r + (accent.r * emission)),
    g: clampUnit(base.g + (accent.g * emission)),
    b: clampUnit(base.b + (accent.b * emission)),
    a: base.a,
  };
}

export function blendColor(left: RgbaColor, right: RgbaColor, mix: number): RgbaColor {
  const t = clampUnit(mix);
  return {
    r: left.r + ((right.r - left.r) * t),
    g: left.g + ((right.g - left.g) * t),
    b: left.b + ((right.b - left.b) * t),
    a: left.a + ((right.a - left.a) * t),
  };
}

export function applyLens(color: RgbaColor, lens: LensConfig, x = 0.5, y = 0.5): RgbaColor {
  const exposure = Math.max(0.1, getLensEffectAmount(lens, 'exposure'));
  const distanceFromCentre = Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2;
  const vignette = 1 - (clampUnit(getLensEffectAmount(lens, 'vignette')) * Math.pow(clampUnit(distanceFromCentre), 1.8));

  return {
    r: clampUnit(color.r * exposure * vignette),
    g: clampUnit(color.g * exposure * vignette),
    b: clampUnit(color.b * exposure * vignette),
    a: color.a,
  };
}

function getSafeDensity(density: number): number {
  return Math.max(density, 0.0001);
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function computeSdfDistance(real: number, imaginary: number, trap: OrbitTrapSetConfig['traps'][number]): number {
  const scale = Math.max(trap.scale, 0.05);
  const cosine = Math.cos(-trap.rotation);
  const sine = Math.sin(-trap.rotation);
  const translatedReal = real - trap.x;
  const translatedImaginary = imaginary - trap.y;
  const localReal = ((translatedReal * cosine) - (translatedImaginary * sine)) / scale;
  const localImaginary = ((translatedReal * sine) + (translatedImaginary * cosine)) / scale;

  switch (trap.shape) {
    case 'point':
      return Math.hypot(localReal, localImaginary) * scale;
    case 'line':
      return Math.abs(localImaginary) * scale;
    case 'circle':
      return Math.abs(Math.hypot(localReal, localImaginary) - 0.5) * scale;
    case 'cross':
      return Math.min(Math.abs(localReal), Math.abs(localImaginary)) * scale;
    case 'spiral': {
      const radius = Math.hypot(localReal, localImaginary);
      const targetRadius = 0.36 + (0.11 * Math.atan2(localImaginary, localReal));
      return Math.abs(radius - targetRadius) * scale;
    }
  }
}
