export type SignalTransform = { kind: 'scale' | 'offset' | 'curve'; value: number }
  | { kind: 'invert' }
  | { kind: 'clamp'; min: number; max: number }
  | { kind: 'smooth'; windowSeconds: number };

export function isSignalTransform(value: unknown, index: number, length: number): value is SignalTransform {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const transform = value as Record<string, unknown>;
  const finite = (candidate: unknown): candidate is number => typeof candidate === 'number' && Number.isFinite(candidate);
  switch (transform.kind) {
    case 'scale': case 'offset': return finite(transform.value);
    case 'curve': return finite(transform.value) && transform.value > 0 && transform.value <= 8;
    case 'invert': return true;
    case 'clamp': return finite(transform.min) && finite(transform.max) && transform.min <= transform.max;
    case 'smooth': return index === length - 1 && finite(transform.windowSeconds)
      && transform.windowSeconds > 0 && transform.windowSeconds <= 10;
    default: return false;
  }
}

/** Applies the shared stateless transform vocabulary. Smoothing is evaluated by the source runtime. */
export function applySignalTransforms(value: number, transforms: readonly SignalTransform[]): number {
  if (!Number.isFinite(value)) throw new Error('Signal value must be finite.');
  let result = value;
  for (const transform of transforms) {
    switch (transform.kind) {
      case 'scale': result *= transform.value; break;
      case 'offset': result += transform.value; break;
      case 'invert': result = -result; break;
      case 'clamp': result = Math.min(transform.max, Math.max(transform.min, result)); break;
      case 'curve': result = Math.sign(result) * Math.pow(Math.abs(result), transform.value); break;
      case 'smooth': break;
    }
    if (!Number.isFinite(result)) throw new Error('Signal transform overflow.');
  }
  return result;
}
