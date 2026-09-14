import type { FormulaId } from '../types/config';
import { phoenixParameterDefinitions } from './phoenix';
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
  phoenix: { id: 'phoenix', displayName: 'Phoenix', parameters: [...phoenixParameterDefinitions], supportedMetrics: ESCAPE_METRICS },
  newton: {
    id: 'newton', displayName: 'Newton',
    parameters: [{ id: 'degree', label: 'Roots', defaultValue: 3, step: 1 }],
    supportedMetrics: ['iteration', 'finalComplex', 'magnitude', 'complexPhase', 'rootIdentity', 'convergenceRate'],
  },
  nova: {
    id: 'nova', displayName: 'Nova',
    parameters: [{ id: 'degree', label: 'Roots', defaultValue: 3, step: 1 }],
    supportedMetrics: ['iteration', 'finalComplex', 'magnitude', 'complexPhase', 'convergenceRate'],
  },
  multibrot: {
    id: 'multibrot', displayName: 'Multibrot',
    parameters: [{ id: 'power', label: 'Power', defaultValue: 3, step: 0.01 }],
    supportedMetrics: ESCAPE_METRICS,
  },
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
