import type { NumericParameterDescriptor } from '../parameters/numeric';
import type { FractalConfig } from '../types/config';

export const phoenixMemoryParameter = {
  id: 'formula.phoenix.memory', owner: { kind: 'formula', id: 'phoenix' },
  label: 'Orbit memory', kind: 'continuous-number', unit: 'dimensionless',
  defaultValue: -0.5, bounds: { min: -1, max: 1 }, interpolation: 'linear',
  modulationEligible: true, display: { min: -1, max: 1, step: 0.01 },
} as const satisfies NumericParameterDescriptor;

/** Julia-plane Phoenix: z[n+1] = z[n]^2 + c + memory*z[n-1], z[-1] = 0. */
export const phoenixParameterDefinitions = [
  { id: 'cReal', label: 'Phoenix real', defaultValue: 0.56667, min: -2, max: 2, step: 0.001 },
  { id: 'cImag', label: 'Phoenix imaginary', defaultValue: 0, min: -2, max: 2, step: 0.001 },
  { id: 'memory', label: phoenixMemoryParameter.label, defaultValue: phoenixMemoryParameter.defaultValue,
    ...phoenixMemoryParameter.bounds, step: phoenixMemoryParameter.display.step },
] as const;

export function readPhoenixMemory(fractal: FractalConfig): number | undefined {
  return fractal.formulaId === 'phoenix' ? normalizePhoenixParameters(fractal.parameters).memory : undefined;
}

/** Interactive writes reject invalid input; import repair continues to use normalisation defaults. */
export function setPhoenixMemory(fractal: FractalConfig, value: number): FractalConfig {
  if (fractal.formulaId !== 'phoenix' || !Number.isFinite(value)) return fractal;
  const memory = Math.min(phoenixMemoryParameter.bounds.max, Math.max(phoenixMemoryParameter.bounds.min, value));
  return { ...fractal, parameters: { ...fractal.parameters, memory } };
}

export function normalizePhoenixParameters(parameters: Record<string, unknown> = {}): Record<string, number> {
  return Object.fromEntries(phoenixParameterDefinitions.map((definition) => {
    const value = parameters[definition.id];
    return [definition.id, typeof value === 'number' && Number.isFinite(value)
      ? Math.min(definition.max, Math.max(definition.min, value)) : definition.defaultValue];
  }));
}
