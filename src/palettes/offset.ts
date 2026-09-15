import type { NumericParameterDescriptor } from '../parameters/numeric';
import type { PaletteConfig } from '../types/config';

export const paletteOffsetParameter = {
  id: 'palette.offset', owner: { kind: 'palette' }, label: 'Offset',
  kind: 'continuous-number', unit: 'palette-coordinate', defaultValue: 0,
  bounds: null, interpolation: 'linear', modulationEligible: true,
  display: { min: -1, max: 1, step: 0.01 },
} as const satisfies NumericParameterDescriptor;

export function readPaletteOffset(palette: PaletteConfig): number {
  return Number.isFinite(palette.offset) ? palette.offset : paletteOffsetParameter.defaultValue;
}

/** Offset is finite but not bounded or wrapped: repeat, mirror and clamp interpret it differently. */
export function setPaletteOffset(palette: PaletteConfig, value: number): PaletteConfig {
  return Number.isFinite(value) ? { ...palette, offset: value } : palette;
}
