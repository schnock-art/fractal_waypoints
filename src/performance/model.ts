import type { RenderConfig } from '../types/config';
import { writeSemanticParameter, type SemanticParameterId } from '../parameters/semantic';
import { normalizeEvaluatedConfig } from '../parameters/validateRenderConfig';
import { isInternalModulationProgram, type InternalModulationProgram } from '../visuals/modulation/program';

// Session-only absolute overrides, limited to the two pressure-tested semantic controls.
export type PerformanceOverrides = Partial<Record<SemanticParameterId, number>>;
export function applyPerformanceOverrides(config: RenderConfig, overrides: PerformanceOverrides): RenderConfig {
  let result = config;
  for (const [id, value] of Object.entries(overrides)) {
    const write = writeSemanticParameter(result, id, value);
    if (write.status === 'invalid' || write.status === 'unknown') throw new Error(write.reason);
    result = write.config; // Inactive pins never reroute to a different formula.
  }
  return normalizeEvaluatedConfig(result);
}

export function commitPerformanceProgram(base: RenderConfig, program: InternalModulationProgram): RenderConfig {
  if (!isInternalModulationProgram(program)) throw new Error('Invalid program: check finite settings, source references and transform limits.');
  return { ...base, modulations: [], modulationProgram: structuredClone(program) };
}

export function movePerformanceMapping(program: InternalModulationProgram, index: number, direction: -1 | 1): InternalModulationProgram {
  const next = structuredClone(program);
  const destination = index + direction;
  if (index < 0 || index >= next.mappings.length || destination < 0 || destination >= next.mappings.length) return next;
  [next.mappings[index], next.mappings[destination]] = [next.mappings[destination], next.mappings[index]];
  return next;
}
