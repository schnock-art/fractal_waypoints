import type { FormulaId } from '../../types/config';

export type MetricCapability =
  | 'escapeState'
  | 'iteration'
  | 'smoothIteration'
  | 'finalComplex'
  | 'magnitude'
  | 'complexPhase'
  | 'orbitTrapDistance'
  | 'derivative'
  | 'distanceEstimate'
  | 'potential'
  | 'rootIdentity'
  | 'convergenceRate';

export type MetricSamplingRequirement = 'point' | 'neighbourhood';

export interface MetricCapabilityDeclaration {
  formulaId: FormulaId;
  supported: readonly MetricCapability[];
}

export interface MetricRequirementValidation {
  compatible: boolean;
  missing: MetricCapability[];
}

export function validateMetricRequirements(
  supported: readonly MetricCapability[],
  required: readonly MetricCapability[],
): MetricRequirementValidation {
  const available = new Set(supported);
  const missing = required.filter((metric) => !available.has(metric));
  return { compatible: missing.length === 0, missing };
}
