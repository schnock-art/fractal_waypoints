import type { LensConfig, MaterialConfig, MaterialId } from '../types/config';
import { cloneOrbitTrapSet, defaultOrbitTrapSet } from './orbitTraps';
import { cloneOrbitTrapAppearance } from './orbitMaterial';
import { cloneLensConfig, createLensConfig } from '../visuals/lenses/model';
import { formulaRegistry } from '../fractals/registry';
import type { MetricCapability, MetricSamplingRequirement } from '../visuals/metrics/capabilities';
import { validateMetricRequirements } from '../visuals/metrics/capabilities';

export interface MaterialDefinition {
  id: MaterialId;
  displayName: string;
  description: string;
  requiredMetrics: readonly MetricCapability[];
  sampling: MetricSamplingRequirement;
  editorId: 'classic' | 'orbitTrap' | 'topographic' | 'domainColouring' | 'surface';
  cpuSupport: 'full' | 'approximate';
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
    cpuSupport: 'full',
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
    cpuSupport: 'full',
    defaults: { id: 'orbitTrap', parameters: { density: 0.032, trapScale: 1 }, orbitTraps: cloneOrbitTrapSet(defaultOrbitTrapSet), orbitAppearance: cloneOrbitTrapAppearance() },
    validate: validateOrbitTrapMaterial,
  },
  topographic: {
    id: 'topographic',
    displayName: 'Topographic',
    description: 'Contour bands mapped from the escape-time field, with nearby samples sharpening the terrain lines.',
    requiredMetrics: ['escapeState', 'smoothIteration', 'magnitude'],
    sampling: 'neighbourhood',
    editorId: 'topographic',
    cpuSupport: 'approximate',
    defaults: { id: 'topographic', parameters: { density: 0.032, contourLevels: 18, contourWidth: 0.13, relief: 0.72 } },
    validate: validateTopographicMaterial,
  },
  domainColouring: {
    id: 'domainColouring',
    displayName: 'Domain Colouring',
    description: 'Maps final-orbit phase and magnitude to colour, revealing the complex flow behind the set.',
    requiredMetrics: ['escapeState', 'finalComplex', 'magnitude', 'complexPhase'],
    sampling: 'point',
    editorId: 'domainColouring',
    cpuSupport: 'full',
    defaults: { id: 'domainColouring', parameters: { phaseScale: 1, magnitudeScale: 0.38, density: 0.032 } },
    validate: validateDomainMaterial,
  },
  surface: {
    id: 'surface',
    displayName: 'Lit Surface',
    description: 'Uses nearby escape-time samples as a height field for directional light, rim light, and specular relief.',
    requiredMetrics: ['escapeState', 'smoothIteration', 'magnitude'],
    sampling: 'neighbourhood',
    editorId: 'surface',
    cpuSupport: 'approximate',
    defaults: { id: 'surface', parameters: { density: 0.032, height: 3.4, lightAngle: 0.7, specular: 0.32, roughness: 0.55, ambient: 0.28 } },
    validate: validateSurfaceMaterial,
  },
};

export interface MaterialPreset {
  id: string;
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
  {
    id: 'topographicAtlas',
    name: 'Topographic Atlas',
    description: 'Clear elevation bands with a softly shaded paper-map feel.',
    material: { id: 'topographic', parameters: { density: 0.032, contourLevels: 22, contourWidth: 0.11, relief: 0.8 } },
    lens: createLensConfig(1.04, 0.2),
  },
  {
    id: 'engravedObsidian',
    name: 'Engraved Obsidian',
    description: 'Dense, narrow contour cuts for crisp structural exploration.',
    material: { id: 'topographic', parameters: { density: 0.022, contourLevels: 34, contourWidth: 0.075, relief: 0.95 } },
    lens: createLensConfig(0.9, 0.35),
  },
  {
    id: 'complexTide',
    name: 'Complex Tide',
    description: 'Phase-driven colour ripples that make orbit direction legible.',
    material: { id: 'domainColouring', parameters: { density: 0.032, phaseScale: 1.2, magnitudeScale: 0.48 } },
    lens: createLensConfig(1.08, 0.12),
  },
  {
    id: 'moltenMetal',
    name: 'Molten Metal',
    description: 'A high-relief lit field with bright directional highlights.',
    material: { id: 'surface', parameters: { density: 0.03, height: 4.5, lightAngle: 0.55, specular: 0.55, roughness: 0.3, ambient: 0.2 } },
    lens: createLensConfig(1.15, 0.22),
  },
  {
    id: 'bioluminescentCoral',
    name: 'Bioluminescent Coral',
    description: 'Softer relief and a broad rim light for organic-looking branches.',
    material: { id: 'surface', parameters: { density: 0.042, height: 2.3, lightAngle: 2.25, specular: 0.18, roughness: 0.78, ambient: 0.42 } },
    lens: createLensConfig(1.12, 0.18),
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
    lens: cloneLensConfig(preset.lens),
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

function validateTopographicMaterial(config: MaterialConfig): string[] {
  const levels = config.parameters.contourLevels ?? 18;
  const width = config.parameters.contourWidth ?? 0.13;
  return Number.isFinite(levels) && levels >= 2 && Number.isFinite(width) && width > 0 && width <= 0.5
    ? [] : ['Topographic materials need at least two contour levels and a positive contour width.'];
}

function validateDomainMaterial(config: MaterialConfig): string[] {
  const phaseScale = config.parameters.phaseScale ?? 1;
  const magnitudeScale = config.parameters.magnitudeScale ?? 0.38;
  return Number.isFinite(phaseScale) && phaseScale > 0 && Number.isFinite(magnitudeScale) && magnitudeScale >= 0
    ? [] : ['Domain Colouring needs a positive phase scale and a non-negative magnitude scale.'];
}

function validateSurfaceMaterial(config: MaterialConfig): string[] {
  const height = config.parameters.height ?? 3.4;
  const specular = config.parameters.specular ?? 0.32;
  return Number.isFinite(height) && height > 0 && Number.isFinite(specular) && specular >= 0 && specular <= 1
    ? [] : ['Lit Surface needs a positive height and specular strength between zero and one.'];
}
