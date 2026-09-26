import { phoenixMemoryParameter, readPhoenixMemory, setPhoenixMemory } from '../fractals/phoenix';
import { paletteOffsetParameter, readPaletteOffset, setPaletteOffset } from '../palettes/offset';
import type { RenderConfig } from '../types/config';

export const juliaRealParameter = { id: 'formula.julia.cReal', label: 'Julia Real', display: { min: -2, max: 2, step: 0.001 } } as const;
export const juliaImaginaryParameter = { id: 'formula.julia.cImag', label: 'Julia Imaginary', display: { min: -2, max: 2, step: 0.001 } } as const;
export type SemanticParameterId = typeof phoenixMemoryParameter.id | typeof paletteOffsetParameter.id
  | typeof juliaRealParameter.id | typeof juliaImaginaryParameter.id;

/** Deliberately closed dispatch, not object-path traversal or a plugin registry. */
export function describeSemanticParameter(id: string) {
  switch (id) {
    case phoenixMemoryParameter.id: return phoenixMemoryParameter;
    case paletteOffsetParameter.id: return paletteOffsetParameter;
    case juliaRealParameter.id: return juliaRealParameter;
    case juliaImaginaryParameter.id: return juliaImaginaryParameter;
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
    case juliaRealParameter.id: return config.fractal.formulaId === 'julia'
      ? { status: 'available', value: config.fractal.parameters.cReal ?? -0.8 }
      : { status: 'inactive', reason: 'Julia Real requires the linked Julia view.' };
    case juliaImaginaryParameter.id: return config.fractal.formulaId === 'julia'
      ? { status: 'available', value: config.fractal.parameters.cImag ?? 0.156 }
      : { status: 'inactive', reason: 'Julia Imaginary requires the linked Julia view.' };
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
  const updated = id === phoenixMemoryParameter.id ? { ...config, fractal: setPhoenixMemory(config.fractal, value) }
    : id === paletteOffsetParameter.id ? { ...config, palette: setPaletteOffset(config.palette, value) }
    : { ...config, fractal: { ...config.fractal, parameters: { ...config.fractal.parameters, [id === juliaRealParameter.id ? 'cReal' : 'cImag']: value } } };
  const result = readSemanticParameter(updated, id);
  return result.status === 'available' ? { status: 'applied', config: updated, value: result.value }
    : { ...result, config };
}
