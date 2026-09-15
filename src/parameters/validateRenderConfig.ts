import type { RenderConfig } from '../types/config';
import { formulaRegistry } from '../fractals/registry';
import { normalizePhoenixParameters } from '../fractals/phoenix';
import { normalizeNewtonParameters } from '../fractals/newton';
import { normalizeMultibrotPower } from '../fractals/multibrot';
import { normalizePalette, validatePalette } from '../palettes/model';
import { materialRegistry, resolveCompatibleRenderConfig, validateMaterialConfig } from '../visuals/materials/registry';
import { lensEffectRegistry, normalizeLensConfig } from '../visuals/lenses/model';
import { normalizeOrbitTrapSet } from '../visuals/traps/orbitTraps';
import { normalizeOrbitTrapAppearance } from '../visuals/traps/orbitMaterial';

/** Fail on non-finite data before repair/normalisation can hide it. Not a JSON schema parser. */
export function assertFiniteNumbers(value: unknown): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Render configuration contains a non-finite number.');
  if (value && typeof value === 'object') for (const child of Object.values(value)) assertFiniteNumbers(child);
}

/** Final boundary for typed authored/evaluated frames; imports retain their separate migration policy. */
export function normalizeEvaluatedConfig(input: RenderConfig): RenderConfig {
  assertFiniteNumbers(input);
  if (!Object.hasOwn(formulaRegistry, input.fractal.formulaId) || !Object.hasOwn(materialRegistry, input.material.id)) {
    throw new Error('Unknown formula or material.');
  }
  const config = structuredClone(input);
  const { viewport, fractal, palette } = config;
  const numericMap = (values: Record<string, number>) => Object.values(values).every((value) => typeof value === 'number' && Number.isFinite(value));
  if (!numericMap(fractal.parameters) || !numericMap(config.material.parameters)
    || config.lens.effects.some((effect) => !numericMap(effect.parameters))
    || palette.stops.some((stop) => !Number.isFinite(stop.position) || !Object.values(stop.color).every(Number.isFinite))) {
    throw new Error('Domain parameters and palette stops must be numeric.');
  }
  const positive = (value: number) => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if (![viewport.centre.re.hi, viewport.centre.re.lo, viewport.centre.im.hi, viewport.centre.im.lo,
    viewport.rotation, viewport.scale.hi, viewport.scale.lo, palette.offset].every(Number.isFinite)
    || !positive(viewport.scale.hi + viewport.scale.lo) || !positive(viewport.aspectRatio)
    || !positive(fractal.maxIterations) || !positive(fractal.bailout) || !positive(config.quality.pixelDensity)) {
    throw new Error('Invalid viewport, iteration, bailout, palette or quality value.');
  }
  fractal.maxIterations = Math.max(1, Math.round(fractal.maxIterations));
  if (fractal.formulaId === 'phoenix') fractal.parameters = normalizePhoenixParameters(fractal.parameters);
  if (fractal.formulaId === 'newton' || fractal.formulaId === 'nova') fractal.parameters = normalizeNewtonParameters(fractal.parameters);
  if (fractal.formulaId === 'multibrot') fractal.parameters = { ...fractal.parameters, power: normalizeMultibrotPower(fractal.parameters.power) };
  if (fractal.formulaId === 'julia' && ![fractal.parameters.cReal, fractal.parameters.cImag].every(Number.isFinite)) {
    throw new Error('Julia requires finite complex parameters.');
  }
  if (!['linear', 'smooth', 'cubic'].includes(palette.interpolation) || !['repeat', 'mirror', 'clamp'].includes(palette.repeatMode)) {
    throw new Error('Unknown palette interpolation or repeat mode.');
  }
  const paletteIssues = validatePalette(palette);
  if (paletteIssues.length) throw new Error(paletteIssues.map((issue) => issue.message).join(' '));
  config.palette = normalizePalette(palette);
  for (const effect of config.lens.effects) {
    if (!Object.hasOwn(lensEffectRegistry, effect.id) || typeof effect.enabled !== 'boolean') throw new Error('Invalid lens effect.');
  }
  config.lens = normalizeLensConfig(config.lens);
  if (config.material.orbitTraps || config.material.id === 'orbitTrap') config.material.orbitTraps = normalizeOrbitTrapSet(config.material.orbitTraps);
  if (config.material.orbitAppearance || config.material.id === 'orbitTrap') config.material.orbitAppearance = normalizeOrbitTrapAppearance(config.material.orbitAppearance);
  const materialIssues = validateMaterialConfig(config.material);
  if (materialIssues.length) throw new Error(materialIssues.join(' '));
  const compatible = resolveCompatibleRenderConfig(config);
  assertFiniteNumbers(compatible);
  return compatible;
}
