import type { LensConfig, MaterialConfig, RenderConfig, Waypoint } from '../types/config';
import { SCHEMA_VERSION } from '../types/config';
import { cloneOrbitTrapSet, normalizeOrbitTrapSet } from '../visuals/traps/orbitTraps';
import { normalizeOrbitTrapAppearance } from '../visuals/traps/orbitMaterial';
import { cloneLensConfig, createLensConfig, normalizeLensConfig } from '../visuals/lenses/model';

type JsonRecord = Record<string, unknown>;

const DEFAULT_MATERIAL: MaterialConfig = {
  id: 'classic',
  parameters: { density: 0.032 },
};

const DEFAULT_LENS: LensConfig = createLensConfig();

export function migrateRenderConfig(value: unknown): RenderConfig | null {
  if (!isRecord(value) || !isRecord(value.viewport) || !isRecord(value.fractal) || !isRecord(value.palette) || !isRecord(value.quality)) {
    return null;
  }

  const material = isMaterialConfig(value.material)
    ? cloneMaterial(value.material)
    : migrateLegacyColouring(value.colouring);
  const lens = migrateLens(value.lens);

  return {
    ...(value as Omit<RenderConfig, 'schemaVersion' | 'material' | 'lens' | 'modulations'>),
    schemaVersion: SCHEMA_VERSION,
    material,
    lens,
    modulations: Array.isArray(value.modulations) ? value.modulations.filter(isParameterModulation).map((modulation) => ({ ...modulation })) : [],
  };
}

export function migrateWaypoint(value: unknown): Waypoint | null {
  if (!isRecord(value) || !isRecord(value.renderConfig)) {
    return null;
  }

  const renderConfig = migrateRenderConfig(value.renderConfig);
  if (!renderConfig || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.createdAt !== 'string') {
    return null;
  }

  return {
    ...(value as Omit<Waypoint, 'renderConfig'>),
    renderConfig,
  };
}

function migrateLegacyColouring(value: unknown): MaterialConfig {
  if (!isRecord(value)) {
    return cloneMaterial(DEFAULT_MATERIAL);
  }

  const parameters = isRecord(value.parameters) ? numberMap(value.parameters) : {};
  return {
    id: value.algorithmId === 'orbitTrap' ? 'orbitTrap' : 'classic',
    parameters: {
      density: numberOr(parameters.density, 0.032),
      ...parameters,
    },
    orbitTraps: value.algorithmId === 'orbitTrap' ? cloneOrbitTrapSet() : undefined,
  };
}

function isMaterialConfig(value: unknown): value is MaterialConfig {
  return isRecord(value) && ['classic', 'orbitTrap', 'topographic', 'domainColouring', 'surface'].includes(String(value.id)) && isRecord(value.parameters);
}

function cloneMaterial(value: MaterialConfig): MaterialConfig {
  return {
    id: value.id,
    parameters: numberMap(value.parameters),
    orbitTraps: value.orbitTraps ? normalizeOrbitTrapSet(value.orbitTraps) : value.id === 'orbitTrap' ? cloneOrbitTrapSet() : undefined,
    orbitAppearance: value.id === 'orbitTrap' ? normalizeOrbitTrapAppearance(value.orbitAppearance) : undefined,
  };
}

function migrateLens(value: unknown): LensConfig {
  if (isRecord(value) && Array.isArray(value.effects)) {
    return normalizeLensConfig(value as unknown as LensConfig);
  }
  if (isRecord(value)) {
    return createLensConfig(numberOr(value.exposure, 1), numberOr(value.vignette, 0));
  }
  return cloneLensConfig(DEFAULT_LENS);
}

function numberMap(value: JsonRecord): Record<string, number> {
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isParameterModulation(value: unknown): value is RenderConfig['modulations'][number] {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.target === 'string'
    && typeof value.waveform === 'string'
    && typeof value.amplitude === 'number'
    && typeof value.frequencyHz === 'number'
    && typeof value.phase === 'number'
    && typeof value.offset === 'number'
    && typeof value.enabled === 'boolean';
}
