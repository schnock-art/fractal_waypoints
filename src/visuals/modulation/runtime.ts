import { cloneOrbitTrapAppearance } from '../traps/orbitMaterial';
import { cloneOrbitTrapSet } from '../traps/orbitTraps';
import { cloneLensConfig, getLensEffect, updateLensEffect } from '../lenses/model';
import type { ParameterModulation, RenderConfig } from '../../types/config';
import { writeSemanticParameter } from '../../parameters/semantic';
import { adaptLegacyModulations, evaluateInternalSource, evaluateMappingSignal, isInternalModulationProgram } from './program';

export function cloneModulations(modulations: ParameterModulation[] = []): ParameterModulation[] {
  return modulations.map((modulation) => ({ ...modulation }));
}

export function evaluateModulation(modulation: ParameterModulation, timeSeconds: number): number {
  if (!modulation.enabled) {
    return 0;
  }
  return evaluateInternalSource(modulation, timeSeconds);
}

export function applyModulations(config: RenderConfig, timeSeconds: number): RenderConfig {
  return evaluateModulations(config, timeSeconds).config;
}

export interface MappingEvaluation {
  id: string;
  status: 'active' | 'disabled' | 'inactive' | 'invalid';
  reason?: string;
  before?: number;
  signal?: number;
  after?: number;
}

export function evaluateModulations(config: RenderConfig, timeSeconds: number): { config: RenderConfig; issues: string[]; mappings: MappingEvaluation[] } {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) throw new Error('Evaluation time must be finite and non-negative.');
  if (config.modulationProgram && config.modulations.length) throw new Error('Choose one modulation representation, not both.');
  const program = config.modulationProgram ?? adaptLegacyModulations(config.modulations);
  const valid = config.modulationProgram ? isInternalModulationProgram(program)
    : config.modulations.every((entry) => isInternalModulationProgram(adaptLegacyModulations([entry])));
  if (!valid) throw new Error('Invalid internal modulation program.');
  const sources = new Map(program.sources.map((source) => [source.id, source]));
  const issues: string[] = [];
  const mappings: MappingEvaluation[] = [];
  let resolved: RenderConfig = {
    ...config,
    material: {
      ...config.material,
      parameters: { ...config.material.parameters },
      orbitTraps: config.material.orbitTraps ? cloneOrbitTrapSet(config.material.orbitTraps) : undefined,
      orbitAppearance: config.material.orbitAppearance ? cloneOrbitTrapAppearance(config.material.orbitAppearance) : undefined,
    },
    lens: cloneLensConfig(config.lens),
    palette: { ...config.palette, stops: config.palette.stops.map((stop) => ({ ...stop, color: { ...stop.color } })) },
    modulations: cloneModulations(config.modulations),
    ...(config.modulationProgram ? { modulationProgram: structuredClone(config.modulationProgram) } : {}),
  };

  for (const mapping of program.mappings) {
    if (!mapping.enabled) { mappings.push({ id: mapping.id, status: 'disabled' }); continue; }
    const current = readModulationTarget(resolved, mapping.target);
    if (current === undefined) {
      issues.push(`${mapping.id}: target inactive.`);
      mappings.push({ id: mapping.id, status: 'inactive', reason: 'Requires Orbit Trap material and the addressed trap slot.' });
      continue;
    }
    try {
      const signal = evaluateMappingSignal(sources.get(mapping.sourceId)!, mapping.transforms, timeSeconds);
      const value = mapping.mode === 'add' ? current + signal : signal;
      if (!Number.isFinite(value)) throw new Error('Non-finite target value.');
      resolved = applyModulationValue(resolved, mapping.target, value);
      mappings.push({ id: mapping.id, status: 'active', before: current, signal, after: readModulationTarget(resolved, mapping.target) });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid signal.';
      issues.push(`${mapping.id}: ${reason}`);
      mappings.push({ id: mapping.id, status: 'invalid', reason });
    }
  }
  return { config: resolved, issues, mappings };
}

export function readModulationTarget(config: RenderConfig, target: ParameterModulation['target']): number | undefined {
  switch (target) {
    case 'palette.offset': return config.palette.offset;
    case 'material.orbitAppearance.emission':
      return config.material.id === 'orbitTrap' ? cloneOrbitTrapAppearance(config.material.orbitAppearance).emission : undefined;
    case 'material.orbitTraps[0].rotation': case 'material.orbitTraps[1].rotation':
      return config.material.id === 'orbitTrap' ? cloneOrbitTrapSet(config.material.orbitTraps).traps[target.includes('[1]') ? 1 : 0]?.rotation : undefined;
    case 'lens.effects.exposure.amount': return getLensEffect(config.lens, 'exposure').parameters.amount;
    case 'lens.effects.vignette.amount': return getLensEffect(config.lens, 'vignette').parameters.amount;
  }
}

function applyModulationValue(config: RenderConfig, target: ParameterModulation['target'], value: number): RenderConfig {
  switch (target) {
    case 'palette.offset':
      return writeSemanticParameter(config, target, value).config;
    case 'material.orbitAppearance.emission': {
      const appearance = cloneOrbitTrapAppearance(config.material.orbitAppearance);
      return { ...config, material: { ...config.material, orbitAppearance: { ...appearance, emission: clamp(value, 0, 0.7) } } };
    }
    case 'material.orbitTraps[0].rotation':
    case 'material.orbitTraps[1].rotation': {
      const index = target.includes('[1]') ? 1 : 0;
      const traps = cloneOrbitTrapSet(config.material.orbitTraps);
      if (!traps.traps[index]) return config;
      traps.traps[index].rotation = value;
      return { ...config, material: { ...config.material, orbitTraps: traps } };
    }
    case 'lens.effects.exposure.amount': {
      return { ...config, lens: updateLensEffect(config.lens, 'exposure', { amount: clamp(value, 0.1, 4) }) };
    }
    case 'lens.effects.vignette.amount': {
      return { ...config, lens: updateLensEffect(config.lens, 'vignette', { amount: clamp(value, 0, 1) }) };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
