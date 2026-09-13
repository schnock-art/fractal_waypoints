import type { LensConfig, MaterialConfig, MaterialId } from '../types/config';
import { cloneOrbitTrapSet, defaultOrbitTrapSet } from './orbitTraps';
import { cloneOrbitTrapAppearance } from './orbitMaterial';
import { createLensConfig } from '../visuals/lenses/model';
import { formulaRegistry } from '../fractals/registry';
import type { MetricCapability, MetricSamplingRequirement } from '../visuals/metrics/capabilities';
import { validateMetricRequirements } from '../visuals/metrics/capabilities';

export interface MaterialDefinition {
  id: MaterialId;
  displayName: string;
  description: string;
  requiredMetrics: readonly MetricCapability[];
  sampling: MetricSamplingRequirement;
  editorId: 'classic' | 'orbitTrap';
  defaults: MaterialConfig;
  validate: (config: MaterialConfig) => string[];
}

export const materialRegistry: Record<MaterialId, MaterialDefinition> = {
  classic: {
    id: 'classic',
    displayName: 'Classic',
    description: 'Continuous escape-time colouring for classic fractal exploration.',
    requiredMetrics: ['escapeState', 'smoothIteration', 'magnitude'],
    sampling: 'point',
    editorId: 'classic',
    defaults: { id: 'classic', parameters: { density: 0.032 } },
    validate: validateClassicMaterial,
  },
  orbitTrap: {
    id: 'orbitTrap',
    displayName: 'Orbit Trap',
    description: 'Blends closest-orbit trap accents with classic escape-time structure for more readable sculptural detail.',
    requiredMetrics: ['escapeState', 'smoothIteration', 'magnitude', 'orbitTrapDistance'],
    sampling: 'point',
    editorId: 'orbitTrap',
    defaults: { id: 'orbitTrap', parameters: { density: 0.032, trapScale: 1 }, orbitTraps: cloneOrbitTrapSet(defaultOrbitTrapSet), orbitAppearance: cloneOrbitTrapAppearance() },
    validate: validateOrbitTrapMaterial,
  },
};

export interface MaterialPreset {
  id: 'classic' | 'filament' | 'signalFire' | 'etchedOrbit' | 'questionableRadioactiveGlass';
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
    lens: createLensConfig(),
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
    lens: createLensConfig(1.08, 0.18),
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
    lens: createLensConfig(1.16, 0.28),
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
    lens: createLensConfig(0.92, 0.35),
  },
  {
    id: 'questionableRadioactiveGlass',
    name: 'Questionable Radioactive Glass',
    description: 'A suspiciously luminous green signal, kept below hazardous bloom levels.',
    material: {
      id: 'orbitTrap',
      parameters: { density: 0.038, trapScale: 1.35 },
      orbitTraps: {
        composition: 'minimum',
        traps: [
          { shape: 'circle', x: 0.1, y: 0, rotation: 0, scale: 0.75 },
          { shape: 'spiral', x: -0.16, y: 0.08, rotation: -0.3, scale: 0.55 },
        ],
      },
      orbitAppearance: { metric: 'nearest', paletteMapping: 'signal', exteriorMix: 0.7, interiorMix: 0.6, emission: 0.35 },
    },
    lens: createLensConfig(1.12, 0.16),
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

export function createMaterialConfig(materialId: MaterialId): MaterialConfig {
  const defaults = materialRegistry[materialId].defaults;
  return {
    ...defaults,
    parameters: { ...defaults.parameters },
    orbitTraps: defaults.orbitTraps ? cloneOrbitTrapSet(defaults.orbitTraps) : undefined,
    orbitAppearance: defaults.orbitAppearance ? cloneOrbitTrapAppearance(defaults.orbitAppearance) : undefined,
  };
}

export function validateMaterialConfig(config: MaterialConfig): string[] {
  return materialRegistry[config.id].validate(config);
}

export function getMaterialCompatibility(formulaId: import('../types/config').FormulaId, materialId: MaterialId) {
  return validateMetricRequirements(formulaRegistry[formulaId].supportedMetrics, materialRegistry[materialId].requiredMetrics);
}

function validateClassicMaterial(config: MaterialConfig): string[] {
  const density = config.parameters.density ?? 0.032;
  return Number.isFinite(density) && density > 0 ? [] : ['Classic material density must be positive.'];
}

function validateOrbitTrapMaterial(config: MaterialConfig): string[] {
  const issues = validateClassicMaterial(config);
  const trapScale = config.parameters.trapScale ?? 1;
  if (!Number.isFinite(trapScale) || trapScale < 0.05) {
    issues.push('Orbit Trap response must be at least 0.05.');
  }
  if (!config.orbitTraps?.traps.length) {
    issues.push('Orbit Trap needs at least one trap.');
  }
  return issues;
}
