import { clonePalette } from '../palettes/model';
import { cloneOrbitTrapSet } from '../visuals/traps/orbitTraps';
import { cloneOrbitTrapAppearance } from '../visuals/traps/orbitMaterial';
import { cloneLensConfig } from '../visuals/lenses/model';
import { cloneModulations } from '../visuals/modulation/runtime';
import type { RenderConfig, Waypoint, WaypointSource } from '../types/config';
import { WAYPOINT_SCHEMA_VERSION } from '../types/config';

export function cloneRenderConfig(config: RenderConfig): RenderConfig {
  return {
    ...config,
    viewport: {
      ...config.viewport,
      centre: {
        re: { ...config.viewport.centre.re },
        im: { ...config.viewport.centre.im },
      },
      scale: { ...config.viewport.scale },
    },
    fractal: {
      ...config.fractal,
      parameters: { ...config.fractal.parameters },
    },
    material: {
      ...config.material,
      parameters: { ...config.material.parameters },
      orbitTraps: config.material.orbitTraps ? cloneOrbitTrapSet(config.material.orbitTraps) : undefined,
      orbitAppearance: config.material.orbitAppearance ? cloneOrbitTrapAppearance(config.material.orbitAppearance) : undefined,
    },
    lens: cloneLensConfig(config.lens),
    modulations: cloneModulations(config.modulations),
    palette: clonePalette(config.palette),
    quality: {
      ...config.quality,
    },
  };
}

export function scoreRenderInterestingness(config: RenderConfig): number {
  const zoomDepth = Math.max(0, -Math.log10(Math.max(config.viewport.scale.hi + config.viewport.scale.lo, 1e-12)));
  const iterationScore = config.fractal.maxIterations / 256;
  const formulaBonus = config.fractal.formulaId === 'julia'
    ? 0.25
    : config.fractal.formulaId === 'burningShip'
      ? 0.22
      : config.fractal.formulaId === 'tricorn'
        ? 0.18
        : 0.1;
  return Number((zoomDepth + iterationScore + formulaBonus).toFixed(2));
}

export function createWaypoint(params: {
  name: string;
  renderConfig: RenderConfig;
  source: WaypointSource;
  description?: string;
  tags?: string[];
  thumbnailDataUrl?: string;
}): Waypoint {
  return {
    schemaVersion: WAYPOINT_SCHEMA_VERSION,
    id: createWaypointId(),
    name: params.name.trim() || 'Untitled Waypoint',
    description: params.description?.trim() || undefined,
    renderConfig: cloneRenderConfig(params.renderConfig),
    tags: params.tags?.filter(Boolean) ?? [],
    source: params.source,
    interestingnessScore: scoreRenderInterestingness(params.renderConfig),
    thumbnailDataUrl: params.thumbnailDataUrl,
    createdAt: new Date().toISOString(),
  };
}

export function updateWaypoint(
  waypoint: Waypoint,
  updates: Partial<Pick<Waypoint, 'name' | 'description' | 'tags' | 'thumbnailDataUrl' | 'renderConfig'>>,
): Waypoint {
  const nextRenderConfig = updates.renderConfig ? cloneRenderConfig(updates.renderConfig) : waypoint.renderConfig;

  return {
    ...waypoint,
    name: updates.name?.trim() || waypoint.name,
    description: updates.description !== undefined ? (updates.description.trim() || undefined) : waypoint.description,
    tags: updates.tags ?? waypoint.tags,
    thumbnailDataUrl: updates.thumbnailDataUrl ?? waypoint.thumbnailDataUrl,
    renderConfig: nextRenderConfig,
    interestingnessScore: scoreRenderInterestingness(nextRenderConfig),
  };
}

function createWaypointId(): string {
  if ('crypto' in globalThis && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `waypoint-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
