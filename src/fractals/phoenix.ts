/** Julia-plane Phoenix: z[n+1] = z[n]^2 + c + memory*z[n-1], z[-1] = 0. */
export const phoenixParameterDefinitions = [
  { id: 'cReal', label: 'Phoenix real', defaultValue: 0.56667, min: -2, max: 2, step: 0.001 },
  { id: 'cImag', label: 'Phoenix imaginary', defaultValue: 0, min: -2, max: 2, step: 0.001 },
  { id: 'memory', label: 'Orbit memory', defaultValue: -0.5, min: -1, max: 1, step: 0.01 },
] as const;

export function normalizePhoenixParameters(parameters: Record<string, unknown> = {}): Record<string, number> {
  return Object.fromEntries(phoenixParameterDefinitions.map((definition) => {
    const value = parameters[definition.id];
    return [definition.id, typeof value === 'number' && Number.isFinite(value)
      ? Math.min(definition.max, Math.max(definition.min, value)) : definition.defaultValue];
  }));
}
