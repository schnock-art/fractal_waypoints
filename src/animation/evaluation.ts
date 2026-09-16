import type { RenderConfig } from '../types/config';
import { assertFiniteNumbers, normalizeEvaluatedConfig } from '../parameters/validateRenderConfig';
import { evaluateModulations } from '../visuals/modulation/runtime';

/** Input is authored/interpolated data, never last frame's output. */
export function evaluateConfiguration(base: RenderConfig, timeSeconds: number) {
  assertFiniteNumbers(base);
  const result = evaluateModulations(base, timeSeconds);
  return { ...result, config: normalizeEvaluatedConfig(result.config) };
}

/** Explicit static capture. It cannot reapply baked motion on reload or use as a keyframe. */
export function snapshotEffectiveConfig(effective: RenderConfig): RenderConfig {
  const result = normalizeEvaluatedConfig(effective);
  result.modulations = [];
  delete result.modulationProgram;
  return result;
}
