import type { FormulaId } from '../types/config';

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
}

export const formulaRegistry: Record<FormulaId, FormulaDefinition> = {
  mandelbrot: {
    id: 'mandelbrot',
    displayName: 'Mandelbrot',
    parameters: [],
  },
  julia: {
    id: 'julia',
    displayName: 'Julia',
    parameters: [
      { id: 'cReal', label: 'Julia real', defaultValue: -0.8, step: 0.001 },
      { id: 'cImag', label: 'Julia imaginary', defaultValue: 0.156, step: 0.001 },
    ],
  },
  burningShip: {
    id: 'burningShip',
    displayName: 'Burning Ship',
    parameters: [],
  },
  tricorn: {
    id: 'tricorn',
    displayName: 'Tricorn',
    parameters: [],
  },
};
