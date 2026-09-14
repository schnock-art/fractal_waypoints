import type { FormulaId, RenderConfig } from '../types/config';
import type { DetailedFormulaIterationSample } from './runtime';
import { multibrotPower } from './multibrot';

export function isConvergentFormula(id: FormulaId): boolean { return id === 'newton' || id === 'nova'; }

export function normalizeNewtonParameters(parameters: Record<string, unknown> = {}): Record<string, number> {
  const bounded = (key: string, fallback: number, min: number, max: number) => {
    const value = parameters[key];
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };
  return {
    degree: Math.round(bounded('degree', 3, 2, 6)),
    rootRadius: bounded('rootRadius', 1, 0.5, 2),
    rootRotation: bounded('rootRotation', 0, -Math.PI, Math.PI),
    relaxation: bounded('relaxation', 1, 0.2, 1.8),
    toleranceExponent: bounded('toleranceExponent', 5, 4, 7),
  };
}

/** p(z) = z^degree - (radius * exp(i*rotation))^degree. */
export function polynomialRoots(parameters: Record<string, number>): [number, number][] {
  const p = normalizeNewtonParameters(parameters);
  return Array.from({ length: p.degree }, (_, index) => {
    const angle = p.rootRotation + 2 * Math.PI * index / p.degree;
    return [p.rootRadius * Math.cos(angle), p.rootRadius * Math.sin(angle)];
  });
}

export type ConvergenceStatus = 'unresolved' | 'converged' | 'singular' | 'diverged';

export function iterateNewton(config: RenderConfig, real: number, imaginary: number): DetailedFormulaIterationSample {
  const p = normalizeNewtonParameters(config.fractal.parameters);
  const nova = config.fractal.formulaId === 'nova';
  const roots = polynomialRoots(p);
  const constant = multibrotPower(...roots[0], p.degree);
  const tolerance = 10 ** -p.toleranceExponent;
  const limit = Math.max(1, Math.floor(config.fractal.maxIterations));
  let re = nova ? roots[0][0] : real;
  let im = nova ? roots[0][1] : imaginary;
  let status: ConvergenceStatus = 'unresolved';
  let residual = 0;
  let iteration = 0;
  for (; iteration < limit; iteration++) {
    const zn = multibrotPower(re, im, p.degree);
    const f = [zn[0] - constant[0], zn[1] - constant[1]];
    residual = Math.hypot(...f);
    if (!nova && residual <= tolerance) { status = 'converged'; break; }
    const power = multibrotPower(re, im, p.degree - 1);
    const dr = p.degree * power[0]; const di = p.degree * power[1];
    const denominator = dr * dr + di * di;
    if (denominator < 1e-20) { status = 'singular'; break; }
    const stepRe = -p.relaxation * (f[0] * dr + f[1] * di) / denominator + (nova ? real : 0);
    const stepIm = -p.relaxation * (f[1] * dr - f[0] * di) / denominator + (nova ? imaginary : 0);
    const nextRe = re + stepRe; const nextIm = im + stepIm;
    // A safety bound, not escape-set membership. Keep final metrics finite.
    if (!Number.isFinite(nextRe + nextIm) || Math.hypot(nextRe, nextIm) > 1e3) { status = 'diverged'; break; }
    re = nextRe; im = nextIm;
    if (nova) {
      residual = Math.hypot(stepRe, stepIm);
      if (residual <= tolerance) { iteration++; status = 'converged'; break; }
    }
  }
  if (!nova) {
    const zn = multibrotPower(re, im, p.degree);
    residual = Math.hypot(zn[0] - constant[0], zn[1] - constant[1]);
    if (status === 'unresolved' && residual <= tolerance) status = 'converged';
  }
  let rootIdentity = -1;
  if (!nova && status === 'converged') {
    const candidates = roots.map(([r, i], index) => ({ index, distance: Math.hypot(re - r, im - i) })).sort((a, b) => a.distance - b.distance);
    if (candidates[0].distance < 0.01 && candidates[1].distance > candidates[0].distance * 2) rootIdentity = candidates[0].index;
  }
  const magnitudeSquared = re * re + im * im;
  return {
    escaped: status === 'diverged', iteration, normalizedIterations: iteration / limit,
    magnitudeSquared, magnitude: Math.sqrt(magnitudeSquared), complexPhase: Math.atan2(im, re),
    finalReal: re, finalImaginary: im, minTrapDistance: Infinity, finalTrapDistance: Infinity,
    smoothIteration: iteration, convergence: { status, rootIdentity, residual, steps: iteration },
  };
}
