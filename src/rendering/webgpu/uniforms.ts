import { getFormulaCode } from '../../fractals/runtime';
import { getLensEffectAmount } from '../../visuals/lenses/model';
import { getMaterialCode, getMaterialDensity, getOrbitTrapAppearance, getOrbitTrapScale, getOrbitTrapSet } from '../../visuals/materials/runtime';
import { getOrbitTrapMetricCode, getOrbitTrapPaletteMappingCode } from '../../visuals/traps/orbitMaterial';
import { getOrbitTrapCompositionCode, getOrbitTrapShapeCode } from '../../visuals/traps/orbitTraps';
import type { RenderConfig } from '../../types/config';

/** Matches RenderUniforms in mandelbrotShader.ts: 17 vec4 values, 16-byte aligned. */
export const RENDER_UNIFORM_FLOAT_COUNT = 17 * 4;
export const RENDER_UNIFORM_BUFFER_SIZE = RENDER_UNIFORM_FLOAT_COUNT * Float32Array.BYTES_PER_ELEMENT;

export function buildRenderUniformData(config: RenderConfig, width: number, height: number): Float32Array {
  const traps = getOrbitTrapSet(config);
  const appearance = getOrbitTrapAppearance(config);
  const firstTrap = traps.traps[0];
  const secondTrap = traps.traps[1] ?? firstTrap;
  const parameters = config.material.parameters;

  return new Float32Array([
    ...buildViewportUniformData(config),
    config.fractal.parameters.cReal ?? 0, 0, config.fractal.parameters.cImag ?? 0, 0,
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
    parameters.roughness ?? 0.55, 0, 0, 0,
    getLensEffectAmount(config.lens, 'exposure'), getLensEffectAmount(config.lens, 'vignette'), getLensEffectAmount(config.lens, 'toneMapping'), getLensEffectAmount(config.lens, 'bloom'),
    getLensEffectParameter(config, 'bloom', 'threshold', 1.1), getLensEffectAmount(config.lens, 'grain'), getLensEffectAmount(config.lens, 'colourGrade'), getLensEffectAmount(config.lens, 'sharpen'),
    getLensEffectAmount(config.lens, 'chromaticAberration'), Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)), 0,
  ]);
}

function getLensEffectParameter(config: RenderConfig, id: import('../../types/config').LensEffectId, parameter: string, fallback: number): number {
  const effect = config.lens.effects.find((candidate) => candidate.id === id);
  return effect?.enabled && Number.isFinite(effect.parameters[parameter]) ? effect.parameters[parameter] : fallback;
}

function buildViewportUniformData(config: RenderConfig): number[] {
  return [
    config.viewport.centre.re.hi, config.viewport.centre.re.lo, config.viewport.centre.im.hi, config.viewport.centre.im.lo,
    config.viewport.scale.hi, config.viewport.scale.lo, Math.cos(config.viewport.rotation), Math.sin(config.viewport.rotation),
  ];
}
