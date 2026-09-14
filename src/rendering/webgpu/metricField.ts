import { materialRegistry } from '../../visuals/materials/registry';
import type { RenderConfig } from '../../types/config';

// Half floats retain smooth field gradients while keeping the temporary target compact.
export const METRIC_FIELD_FORMAT: GPUTextureFormat = 'rgba16float';

export function requiresMetricField(config: Pick<RenderConfig, 'material'>): boolean {
  return materialRegistry[config.material.id].sampling === 'neighbourhood';
}

export function shouldAllocateMetricField(
  hasFieldTexture: boolean,
  config: Pick<RenderConfig, 'material'>,
): boolean {
  return !hasFieldTexture && requiresMetricField(config);
}

export function shouldResizeMetricField(hasFieldTexture: boolean, widthChanged: boolean): boolean {
  return hasFieldTexture && widthChanged;
}
