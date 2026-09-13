import { clonePalette } from '../palettes/model';
import { palettePresets } from '../palettes/presets';
import type {
  ComparisonConfig,
  ComparisonMode,
  ComparisonSide,
  RenderConfig,
  ViewportConfig,
} from '../types/config';
import { COMPARISON_SCHEMA_VERSION } from '../types/config';
import { cloneRenderConfig } from '../navigation/waypoints';

export function createDefaultComparisonConfig(baseConfig: RenderConfig): ComparisonConfig {
  const left = cloneRenderConfig(baseConfig);
  const right = cloneRenderConfig(baseConfig);

  right.palette = clonePalette(palettePresets[1]?.palette ?? baseConfig.palette);
  right.material = {
    ...right.material,
    parameters: {
      ...right.material.parameters,
      density: (right.material.parameters.density ?? 0.032) * 1.22,
    },
  };

  return {
    schemaVersion: COMPARISON_SCHEMA_VERSION,
    mode: 'split',
    synchroniseViewport: true,
    wipe: 0.5,
    overlayOpacity: 0.6,
    activeSide: 'left',
    left,
    right: synchronizeViewport(baseConfig.viewport, right),
  };
}

export function updateComparisonSide(
  comparison: ComparisonConfig,
  side: ComparisonSide,
  nextConfig: RenderConfig,
): ComparisonConfig {
  const cloned = cloneRenderConfig(nextConfig);
  const next = side === 'left'
    ? { ...comparison, left: cloned }
    : { ...comparison, right: cloned };

  if (!comparison.synchroniseViewport) {
    return next;
  }

  const sharedViewport = cloneViewport(cloned.viewport);
  return {
    ...next,
    left: synchronizeViewport(sharedViewport, next.left),
    right: synchronizeViewport(sharedViewport, next.right),
  };
}

export function updateComparisonMode(
  comparison: ComparisonConfig,
  mode: ComparisonMode,
): ComparisonConfig {
  return {
    ...comparison,
    mode,
  };
}

export function setComparisonSynchronization(
  comparison: ComparisonConfig,
  synchroniseViewport: boolean,
): ComparisonConfig {
  if (!synchroniseViewport) {
    return {
      ...comparison,
      synchroniseViewport,
    };
  }

  return {
    ...comparison,
    synchroniseViewport,
    right: synchronizeViewport(comparison.left.viewport, comparison.right),
  };
}

export function applySharedViewport(
  comparison: ComparisonConfig,
  viewport: ViewportConfig,
): ComparisonConfig {
  if (!comparison.synchroniseViewport) {
    return comparison;
  }

  return {
    ...comparison,
    left: synchronizeViewport(viewport, comparison.left),
    right: synchronizeViewport(viewport, comparison.right),
  };
}

export function cloneViewport(viewport: ViewportConfig): ViewportConfig {
  return {
    ...viewport,
    centre: {
      re: { ...viewport.centre.re },
      im: { ...viewport.centre.im },
    },
    scale: { ...viewport.scale },
  };
}

function synchronizeViewport(viewport: ViewportConfig, config: RenderConfig): RenderConfig {
  return {
    ...config,
    viewport: cloneViewport(viewport),
  };
}
