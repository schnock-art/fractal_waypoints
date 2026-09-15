import { phoenixMemoryParameter, readPhoenixMemory, setPhoenixMemory } from '../fractals/phoenix';
import { paletteOffsetParameter, readPaletteOffset, setPaletteOffset } from '../palettes/offset';
import type { RenderConfig } from '../types/config';

export type SemanticParameterId = typeof phoenixMemoryParameter.id | typeof paletteOffsetParameter.id;

/** Deliberately closed dispatch, not object-path traversal or a plugin registry. */
export function describeSemanticParameter(id: string) {
  switch (id) {
    case phoenixMemoryParameter.id: return phoenixMemoryParameter;
    case paletteOffsetParameter.id: return paletteOffsetParameter;
    default: return undefined;
  }
}

export type ParameterRead = { status: 'available'; value: number }
  | { status: 'inactive' | 'unknown'; reason: string };

export function readSemanticParameter(config: RenderConfig, id: string): ParameterRead {
  switch (id) {
    case phoenixMemoryParameter.id: {
      const value = readPhoenixMemory(config.fractal);
      return value === undefined ? { status: 'inactive', reason: 'Orbit memory requires Phoenix.' }
        : { status: 'available', value };
    }
    case paletteOffsetParameter.id: return { status: 'available', value: readPaletteOffset(config.palette) };
    default: return { status: 'unknown', reason: 'Unknown semantic parameter.' };
  }
}

export type ParameterWrite = { status: 'applied'; config: RenderConfig; value: number }
  | { status: 'inactive' | 'unknown' | 'invalid'; config: RenderConfig; reason: string };

/** Caller chooses the view/config; no selection, clock, base-state ownership, or GPU knowledge here. */
export function writeSemanticParameter(config: RenderConfig, id: string, value: unknown): ParameterWrite {
  const current = readSemanticParameter(config, id);
  if (current.status !== 'available') return { ...current, config };
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { status: 'invalid', config, reason: 'A finite numeric value is required.' };
  }
  const updated = id === phoenixMemoryParameter.id
    ? { ...config, fractal: setPhoenixMemory(config.fractal, value) }
    : { ...config, palette: setPaletteOffset(config.palette, value) };
  const result = readSemanticParameter(updated, id);
  return result.status === 'available' ? { status: 'applied', config: updated, value: result.value }
    : { ...result, config };
}
