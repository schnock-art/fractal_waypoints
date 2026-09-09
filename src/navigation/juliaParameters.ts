import type { NavigationActionId } from '../types/config';

const DEFAULT_JULIA_REAL = -0.8;
const DEFAULT_JULIA_IMAGINARY = 0.156;

export function applyJuliaParameterAction(
  parameters: Record<string, number>,
  action: NavigationActionId,
  precisionMode: boolean,
): Record<string, number> {
  const step = precisionMode ? 0.0001 : 0.001;
  const cReal = parameters.cReal ?? DEFAULT_JULIA_REAL;
  const cImag = parameters.cImag ?? DEFAULT_JULIA_IMAGINARY;

  if (action === 'juliaRealDecrease') {
    return { ...parameters, cReal: cReal - step };
  }

  if (action === 'juliaRealIncrease') {
    return { ...parameters, cReal: cReal + step };
  }

  if (action === 'juliaImaginaryIncrease') {
    return { ...parameters, cImag: cImag + step };
  }

  if (action === 'juliaImaginaryDecrease') {
    return { ...parameters, cImag: cImag - step };
  }

  return parameters;
}
