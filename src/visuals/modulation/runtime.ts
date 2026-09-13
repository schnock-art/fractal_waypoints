import { cloneOrbitTrapAppearance } from '../../colouring/orbitMaterial';
import { cloneOrbitTrapSet } from '../../colouring/orbitTraps';
import { cloneLensConfig, getLensEffect, updateLensEffect } from '../lenses/model';
import type { ParameterModulation, RenderConfig } from '../../types/config';

export function cloneModulations(modulations: ParameterModulation[] = []): ParameterModulation[] {
  return modulations.map((modulation) => ({ ...modulation }));
}

export function evaluateModulation(modulation: ParameterModulation, timeSeconds: number): number {
  if (!modulation.enabled) {
    return 0;
  }
  const phase = (timeSeconds * modulation.frequencyHz + modulation.phase) % 1;
  const waveform = modulation.waveform === 'sine'
    ? Math.sin(phase * Math.PI * 2)
    : modulation.waveform === 'triangle'
      ? 1 - (4 * Math.abs(phase - 0.5))
      : modulation.waveform === 'saw'
        ? (phase * 2) - 1
        : modulation.waveform === 'constant'
          ? 1
          : 0;
  return modulation.offset + (modulation.amplitude * waveform);
}

export function applyModulations(config: RenderConfig, timeSeconds: number): RenderConfig {
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
  };

  for (const modulation of config.modulations) {
    const value = evaluateModulation(modulation, timeSeconds);
    resolved = applyModulationValue(resolved, modulation.target, value);
  }
  return resolved;
}

function applyModulationValue(config: RenderConfig, target: ParameterModulation['target'], value: number): RenderConfig {
  switch (target) {
    case 'palette.offset':
      return { ...config, palette: { ...config.palette, offset: config.palette.offset + value } };
    case 'material.orbitAppearance.emission': {
      const appearance = cloneOrbitTrapAppearance(config.material.orbitAppearance);
      return { ...config, material: { ...config.material, orbitAppearance: { ...appearance, emission: clamp(appearance.emission + value, 0, 0.7) } } };
    }
    case 'material.orbitTraps[0].rotation':
    case 'material.orbitTraps[1].rotation': {
      const index = target.includes('[1]') ? 1 : 0;
      const traps = cloneOrbitTrapSet(config.material.orbitTraps);
      if (!traps.traps[index]) return config;
      traps.traps[index].rotation += value;
      return { ...config, material: { ...config.material, orbitTraps: traps } };
    }
    case 'lens.effects.exposure.amount': {
      const effect = getLensEffect(config.lens, 'exposure');
      return { ...config, lens: updateLensEffect(config.lens, 'exposure', { amount: clamp((effect.parameters.amount ?? 1) + value, 0.1, 4) }) };
    }
    case 'lens.effects.vignette.amount': {
      const effect = getLensEffect(config.lens, 'vignette');
      return { ...config, lens: updateLensEffect(config.lens, 'vignette', { amount: clamp((effect.parameters.amount ?? 0) + value, 0, 1) }) };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
