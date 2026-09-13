import type { FormulaId } from '../types/config';
import type { MetricCapability } from '../visuals/metrics/capabilities';

export interface FormulaParameterDefinition {
  id: string;
  label: string;
  defaultValue: number;
  step: number;
}

export interface FormulaDefinition {
  id: FormulaId;
  displayName: string;
  parameters: FormulaParameterDefinition[];
  supportedMetrics: readonly MetricCapability[];
}

const ESCAPE_METRICS: readonly MetricCapability[] = [
  'escapeState',
  'iteration',
  'smoothIteration',
  'finalComplex',
  'magnitude',
  'complexPhase',
  'orbitTrapDistance',
];

export const formulaRegistry: Record<FormulaId, FormulaDefinition> = {
  mandelbrot: {
    id: 'mandelbrot',
    displayName: 'Mandelbrot',
    parameters: [],
    supportedMetrics: ESCAPE_METRICS,
  },
  julia: {
    id: 'julia',
    displayName: 'Julia',
    parameters: [
      { id: 'cReal', label: 'Julia real', defaultValue: -0.8, step: 0.001 },
      { id: 'cImag', label: 'Julia imaginary', defaultValue: 0.156, step: 0.001 },
    ],
    supportedMetrics: ESCAPE_METRICS,
  },
  burningShip: {
    id: 'burningShip',
    displayName: 'Burning Ship',
    parameters: [],
    supportedMetrics: ESCAPE_METRICS,
  },
  tricorn: {
    id: 'tricorn',
    displayName: 'Tricorn',
    parameters: [],
    supportedMetrics: ESCAPE_METRICS,
  },
};
