import type { LensConfig, MaterialConfig, MaterialId } from '../types/config';
import { cloneOrbitTrapSet, defaultOrbitTrapSet } from './orbitTraps';
import { cloneOrbitTrapAppearance } from './orbitMaterial';

export interface MaterialDefinition {
  id: MaterialId;
  displayName: string;
  description: string;
  requiredMetrics: readonly ('smoothIteration' | 'trapDistance')[];
}

export const materialRegistry: Record<MaterialId, MaterialDefinition> = {
  classic: {
    id: 'classic',
    displayName: 'Classic',
    description: 'Continuous escape-time colouring for classic fractal exploration.',
    requiredMetrics: ['smoothIteration'],
  },
  orbitTrap: {
    id: 'orbitTrap',
    displayName: 'Orbit Trap',
    description: 'Blends closest-orbit trap accents with classic escape-time structure for more readable sculptural detail.',
    requiredMetrics: ['smoothIteration', 'trapDistance'],
  },
};

export interface LensEffectDefinition {
  id: 'exposure' | 'vignette';
  displayName: string;
  description: string;
  cpuSupported: boolean;
}

export const lensEffectRegistry: LensEffectDefinition[] = [
  {
    id: 'exposure',
    displayName: 'Exposure',
    description: 'Adjusts the final scene brightness without changing fractal sampling.',
    cpuSupported: true,
  },
  {
    id: 'vignette',
    displayName: 'Vignette',
    description: 'Gently darkens the outer frame to keep visual focus inside the view.',
    cpuSupported: true,
  },
];

export interface MaterialPreset {
  id: 'classic' | 'filament' | 'signalFire' | 'etchedOrbit';
  name: string;
  description: string;
  material: MaterialConfig;
  lens: LensConfig;
}

export const materialPresets: MaterialPreset[] = [
  {
    id: 'classic',
    name: 'Classic Escape',
    description: 'A clean smooth-iteration baseline for ordinary exploration.',
    material: { id: 'classic', parameters: { density: 0.032 } },
    lens: { exposure: 1, vignette: 0 },
  },
  {
    id: 'filament',
    name: 'Filament',
    description: 'Circle and cross traps with a focused, readable glow pattern.',
    material: {
      id: 'orbitTrap',
      parameters: { density: 0.034, trapScale: 1.15 },
      orbitTraps: cloneOrbitTrapSet(defaultOrbitTrapSet),
      orbitAppearance: cloneOrbitTrapAppearance(),
    },
    lens: { exposure: 1.08, vignette: 0.18 },
  },
  {
    id: 'signalFire',
    name: 'Signal Fire',
    description: 'A spiral signal paired with a small off-centre circle.',
    material: {
      id: 'orbitTrap',
      parameters: { density: 0.042, trapScale: 1.55 },
      orbitTraps: {
        composition: 'minimum',
        traps: [
          { shape: 'spiral', x: 0, y: 0, rotation: 0.2, scale: 0.9 },
          { shape: 'circle', x: -0.36, y: 0.18, rotation: 0, scale: 0.42 },
        ],
      },
      orbitAppearance: {
        metric: 'final',
        paletteMapping: 'distanceBands',
        exteriorMix: 0.86,
        interiorMix: 0.72,
        emission: 0.24,
      },
    },
    lens: { exposure: 1.16, vignette: 0.28 },
  },
  {
    id: 'etchedOrbit',
    name: 'Etched Orbit',
    description: 'An intersecting line and circle for a precise engraved look.',
    material: {
      id: 'orbitTrap',
      parameters: { density: 0.026, trapScale: 0.8 },
      orbitTraps: {
        composition: 'maximum',
        traps: [
          { shape: 'line', x: 0, y: 0, rotation: 0.5, scale: 0.7 },
          { shape: 'circle', x: 0, y: 0, rotation: 0, scale: 1.15 },
        ],
      },
      orbitAppearance: {
        metric: 'nearest',
        paletteMapping: 'distanceBands',
        exteriorMix: 0.72,
        interiorMix: 0.38,
        emission: 0.06,
      },
    },
    lens: { exposure: 0.92, vignette: 0.35 },
  },
];

export function cloneMaterialPreset(preset: MaterialPreset): Pick<MaterialPreset, 'material' | 'lens'> {
  return {
    material: {
      ...preset.material,
      parameters: { ...preset.material.parameters },
      orbitTraps: preset.material.orbitTraps ? cloneOrbitTrapSet(preset.material.orbitTraps) : undefined,
      orbitAppearance: preset.material.orbitAppearance ? cloneOrbitTrapAppearance(preset.material.orbitAppearance) : undefined,
    },
    lens: { ...preset.lens },
  };
}
