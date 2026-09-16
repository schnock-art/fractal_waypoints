import { getFormulaCode } from '../../fractals/runtime';
import { normalizeMultibrotPower } from '../../fractals/multibrot';
import { normalizePhoenixParameters } from '../../fractals/phoenix';
import { normalizeNewtonParameters, polynomialRoots } from '../../fractals/newton';
import { multibrotPower } from '../../fractals/multibrot';
import { getLensEffectAmount } from '../../visuals/lenses/model';
import { getMaterialCode, getMaterialDensity, getOrbitTrapAppearance, getOrbitTrapScale, getOrbitTrapSet } from '../../visuals/materials/runtime';
import { getOrbitTrapMetricCode, getOrbitTrapPaletteMappingCode } from '../../visuals/traps/orbitMaterial';
import { getOrbitTrapCompositionCode, getOrbitTrapShapeCode } from '../../visuals/traps/orbitTraps';
import type { DoubleSingle, RenderConfig } from '../../types/config';

/** Matches RenderUniforms in mandelbrotShader.ts: 20 vec4 values, 16-byte aligned. */
export const RENDER_UNIFORM_FLOAT_COUNT = 20 * 4;
export const RENDER_UNIFORM_BUFFER_SIZE = RENDER_UNIFORM_FLOAT_COUNT * Float32Array.BYTES_PER_ELEMENT;

export function buildRenderUniformData(config: RenderConfig, width: number, height: number): Float32Array {
  const traps = getOrbitTrapSet(config);
  const appearance = getOrbitTrapAppearance(config);
  const firstTrap = traps.traps[0];
  const secondTrap = traps.traps[1] ?? firstTrap;
  const parameters = config.material.parameters;
  const phoenix = normalizePhoenixParameters(config.fractal.parameters);
  const cReal = config.fractal.formulaId === 'phoenix' ? phoenix.cReal : config.fractal.parameters.cReal ?? 0;
  const cImag = config.fractal.formulaId === 'phoenix' ? phoenix.cImag : config.fractal.parameters.cImag ?? 0;
  const polynomial = normalizeNewtonParameters(config.fractal.parameters);
  const constant = multibrotPower(...polynomialRoots(polynomial)[0], polynomial.degree);

  return new Float32Array([
    ...buildViewportUniformData(config),
    Math.fround(cReal), cReal - Math.fround(cReal), Math.fround(cImag), cImag - Math.fround(cImag),
    config.fractal.bailout, config.fractal.maxIterations, width, height,
    getMaterialDensity(config), getMaterialCode(config.material.id), config.viewport.aspectRatio, getFormulaCode(config.fractal.formulaId),
    getOrbitTrapScale(config), getLensEffectAmount(config.lens, 'exposure'), getLensEffectAmount(config.lens, 'vignette'), appearance.emission,
    firstTrap.x, firstTrap.y, firstTrap.rotation, firstTrap.scale,
    secondTrap.x, secondTrap.y, secondTrap.rotation, secondTrap.scale,
    getOrbitTrapShapeCode(firstTrap.shape), getOrbitTrapShapeCode(secondTrap.shape), getOrbitTrapCompositionCode(traps.composition), traps.traps.length,
    getOrbitTrapMetricCode(appearance.metric), getOrbitTrapPaletteMappingCode(appearance.paletteMapping), appearance.exteriorMix, appearance.interiorMix,
    parameters.contourLevels ?? 18, parameters.contourWidth ?? 0.13, parameters.relief ?? 0.72, 0,
    parameters.height ?? 3.4, parameters.lightAngle ?? 0.7, parameters.specular ?? 0.32, parameters.ambient ?? 0.28,
    parameters.phaseScale ?? 1, parameters.magnitudeScale ?? 0.38, 0, 0,
    // detail.w MUST remain positive zero: its bits are the runtime XOR mask
    // used to preserve rounding boundaries in the double-single shader.
    parameters.roughness ?? 0.55, config.fractal.formulaId === 'multibrot' ? normalizeMultibrotPower(config.fractal.parameters.power) : 2, polynomial.rootRotation, 0,
    getLensEffectAmount(config.lens, 'exposure'), getLensEffectAmount(config.lens, 'vignette'), getLensEffectAmount(config.lens, 'toneMapping'), getLensEffectAmount(config.lens, 'bloom'),
    getLensEffectParameter(config, 'bloom', 'threshold', 1.1), getLensEffectAmount(config.lens, 'grain'), getLensEffectAmount(config.lens, 'colourGrade'), getLensEffectAmount(config.lens, 'sharpen'),
    getLensEffectAmount(config.lens, 'chromaticAberration'), Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)), 0,
    polynomial.degree, polynomial.relaxation, 10 ** -polynomial.toleranceExponent, polynomial.rootRadius,
    Math.fround(constant[0]), constant[0] - Math.fround(constant[0]), Math.fround(constant[1]), constant[1] - Math.fround(constant[1]),
    Math.fround(phoenix.memory), phoenix.memory - Math.fround(phoenix.memory), 0, 0,
  ]);
}

function getLensEffectParameter(config: RenderConfig, id: import('../../types/config').LensEffectId, parameter: string, fallback: number): number {
  const effect = config.lens.effects.find((candidate) => candidate.id === id);
  return effect?.enabled && Number.isFinite(effect.parameters[parameter]) ? effect.parameters[parameter] : fallback;
}

function buildViewportUniformData(config: RenderConfig): number[] {
  const centreRe = splitForGpu(config.viewport.centre.re);
  const centreIm = splitForGpu(config.viewport.centre.im);
  const scale = splitForGpu(config.viewport.scale);

  return [
    ...centreRe, ...centreIm,
    ...scale, Math.cos(config.viewport.rotation), Math.sin(config.viewport.rotation),
  ];
}

/**
 * JavaScript calculations keep their intermediate components as f64, while
 * WGSL uniforms are f32. Re-split the represented value at this boundary so
 * the GPU receives a canonical high/low f32 pair rather than losing the
 * residual when Float32Array performs its conversion.
 */
function splitForGpu(value: DoubleSingle): [number, number] {
  const represented = value.hi + value.lo;
  const high = Math.fround(represented);
  return [high, Math.fround(represented - high)];
}
