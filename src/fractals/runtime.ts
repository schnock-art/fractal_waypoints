import type { FormulaId, RenderConfig } from '../types/config';
import { multibrotPower, normalizeMultibrotPower } from './multibrot';
import { isConvergentFormula, iterateNewton, type ConvergenceStatus } from './newton';
import { computeOrbitTrapDistance } from '../visuals/materials/runtime';

export interface FormulaIterationSample {
  escaped: boolean;
  normalizedIterations: number;
  basin?: number;
}

export interface DetailedFormulaIterationSample extends FormulaIterationSample {
  convergence?: { status: ConvergenceStatus; rootIdentity: number; residual: number; steps: number };
  iteration: number;
  magnitudeSquared: number;
  magnitude: number;
  complexPhase: number;
  minTrapDistance: number;
  finalTrapDistance: number;
  smoothIteration: number;
  finalReal: number;
  finalImaginary: number;
}

export function getFormulaCode(formulaId: FormulaId): number {
  switch (formulaId) {
    case 'newton': return 5;
    case 'nova': return 6;
    case 'multibrot': return 4;
    case 'mandelbrot':
      return 0;
    case 'julia':
      return 1;
    case 'burningShip':
      return 2;
    case 'tricorn':
      return 3;
    default:
      return 0;
  }
}

export function iterateFormulaSample(
  config: RenderConfig,
  real: number,
  imaginary: number,
): FormulaIterationSample {
  const detailed = iterateFormulaDetailed(config, real, imaginary, false);
  return {
    escaped: detailed.escaped,
    normalizedIterations: detailed.normalizedIterations,
    ...(detailed.convergence ? { basin: detailed.convergence.status === 'converged' ? detailed.convergence.rootIdentity + 2 : 0 } : {}),
  };
}

export function iterateFormulaDetailed(
  config: RenderConfig,
  real: number,
  imaginary: number,
  trackOrbitTrap = true,
): DetailedFormulaIterationSample {
  if (isConvergentFormula(config.fractal.formulaId)) return iterateNewton(config, real, imaginary);
  const maxIterations = Math.max(1, config.fractal.maxIterations);
  const bailoutSquared = config.fractal.bailout * config.fractal.bailout;
  const formulaId = config.fractal.formulaId;
  const power = formulaId === 'multibrot' ? normalizeMultibrotPower(config.fractal.parameters.power) : 2;

  let zReal = formulaId === 'julia' ? real : 0;
  let zImaginary = formulaId === 'julia' ? imaginary : 0;
  const cReal = formulaId === 'julia' ? (config.fractal.parameters.cReal ?? -0.8) : real;
  const cImaginary = formulaId === 'julia' ? (config.fractal.parameters.cImag ?? 0.156) : imaginary;
  let minTrapDistance = Number.POSITIVE_INFINITY;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let nextReal: number;
    let nextImaginary: number;

    if (formulaId === 'multibrot') {
      const powered = multibrotPower(zReal, zImaginary, power);
      nextReal = powered[0] + cReal;
      nextImaginary = powered[1] + cImaginary;
    } else if (formulaId === 'burningShip') {
      const absReal = Math.abs(zReal);
      const absImaginary = Math.abs(zImaginary);
      nextReal = (absReal * absReal) - (absImaginary * absImaginary) + cReal;
      nextImaginary = (2 * absReal * absImaginary) + cImaginary;
    } else if (formulaId === 'tricorn') {
      nextReal = (zReal * zReal) - (zImaginary * zImaginary) + cReal;
      nextImaginary = (-2 * zReal * zImaginary) + cImaginary;
    } else {
      nextReal = (zReal * zReal) - (zImaginary * zImaginary) + cReal;
      nextImaginary = (2 * zReal * zImaginary) + cImaginary;
    }

    zReal = nextReal;
    zImaginary = nextImaginary;
    if (trackOrbitTrap) {
      minTrapDistance = Math.min(minTrapDistance, computeOrbitTrapDistance(
        zReal,
        zImaginary,
        config.material.orbitTraps,
      ));
    }

    const magnitudeSquared = (zReal * zReal) + (zImaginary * zImaginary);
    if (magnitudeSquared > bailoutSquared) {
      return {
        escaped: true,
        iteration,
        normalizedIterations: iteration / maxIterations,
        magnitudeSquared,
        magnitude: Math.sqrt(magnitudeSquared),
        complexPhase: Math.atan2(zImaginary, zReal),
        minTrapDistance,
        finalTrapDistance: trackOrbitTrap
          ? computeOrbitTrapDistance(zReal, zImaginary, config.material.orbitTraps)
          : Number.POSITIVE_INFINITY,
        smoothIteration: iteration + 1 - Math.log2(Math.log2(Math.max(Math.sqrt(magnitudeSquared), 1.0001))) / Math.log2(power),
        finalReal: zReal,
        finalImaginary: zImaginary,
      };
    }
  }

  return {
    escaped: false,
    iteration: maxIterations,
    normalizedIterations: 1,
    magnitudeSquared: (zReal * zReal) + (zImaginary * zImaginary),
    magnitude: Math.hypot(zReal, zImaginary),
    complexPhase: Math.atan2(zImaginary, zReal),
    minTrapDistance,
    finalTrapDistance: trackOrbitTrap
      ? computeOrbitTrapDistance(zReal, zImaginary, config.material.orbitTraps)
      : Number.POSITIVE_INFINITY,
    smoothIteration: maxIterations,
    finalReal: zReal,
    finalImaginary: zImaginary,
  };
}
