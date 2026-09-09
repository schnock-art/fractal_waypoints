import type { ColouringAlgorithmId, RenderConfig, RgbaColor } from '../types/config';

export function getColouringCode(algorithmId: ColouringAlgorithmId): number {
  switch (algorithmId) {
    case 'smoothEscapeTime':
      return 0;
    case 'orbitTrap':
      return 1;
    default:
      return 0;
  }
}

export function getOrbitTrapScale(config: RenderConfig): number {
  return config.colouring.parameters.trapScale ?? 1;
}

export function sampleSmoothEscapePaletteT(iteration: number, magnitudeSquared: number, density: number): number {
  const smoothIteration = iteration + 1 - Math.log2(Math.log2(Math.max(Math.sqrt(magnitudeSquared), 1.0001)));
  return fract(smoothIteration * getSafeDensity(density));
}

export function sampleOrbitTrapPaletteT(minTrapDistance: number, density: number, trapScale: number): number {
  return fract(computeOrbitTrapSignal(minTrapDistance, trapScale) * getSafeDensity(density) * 24);
}

export function computeOrbitTrapDistance(real: number, imaginary: number): number {
  const radialTrap = Math.abs(Math.hypot(real, imaginary) - 0.5);
  const crossTrap = Math.min(Math.abs(real), Math.abs(imaginary));
  return Math.min(radialTrap, crossTrap);
}

export function computeOrbitTrapSignal(minTrapDistance: number, trapScale: number): number {
  const safeScale = Math.max(trapScale, 0.05);
  return 1 / (1 + (Math.max(minTrapDistance, 0) * safeScale * 12));
}

export function computeOrbitTrapExteriorMix(
  normalizedIterations: number,
  minTrapDistance: number,
  trapScale: number,
): number {
  const boundaryBias = clampUnit(normalizedIterations);
  const trapBias = computeOrbitTrapSignal(minTrapDistance, trapScale);
  return clampUnit(0.18 + (boundaryBias * 0.3) + (trapBias * 0.18));
}

export function computeOrbitTrapInteriorMix(minTrapDistance: number, trapScale: number): number {
  return clampUnit(0.22 + (computeOrbitTrapSignal(minTrapDistance, trapScale) * 0.42));
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

function getSafeDensity(density: number): number {
  return Math.max(density, 0.0001);
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function fract(value: number): number {
  return value - Math.floor(value);
}
