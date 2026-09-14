import type { LensConfig, LensEffectConfig, LensEffectId } from '../../types/config';

export interface LensEffectDefinition {
  id: LensEffectId;
  displayName: string;
  description: string;
  cpuSupported: boolean;
  parameters: readonly {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
  }[];
}

export const lensEffectRegistry: Record<LensEffectId, LensEffectDefinition> = {
  exposure: {
    id: 'exposure',
    displayName: 'Exposure',
    description: 'Adjusts final scene brightness without changing fractal sampling.',
    cpuSupported: true,
    parameters: [{ id: 'amount', label: 'Exposure', min: 0.5, max: 1.8, step: 0.05, defaultValue: 1 }],
  },
  toneMapping: { id: 'toneMapping', displayName: 'Tone mapping', description: 'ACES filmic mapping keeps bright detail from flattening the scene.', cpuSupported: false, parameters: [{ id: 'amount', label: 'Tone mapping', min: 0, max: 1, step: 0.05, defaultValue: 1 }] },
  bloom: { id: 'bloom', displayName: 'Bloom', description: 'A capped glow drawn only from highlights above the selected threshold.', cpuSupported: false, parameters: [{ id: 'amount', label: 'Bloom intensity', min: 0, max: 0.7, step: 0.05, defaultValue: 0 }, { id: 'threshold', label: 'Bloom threshold', min: 0.4, max: 2, step: 0.05, defaultValue: 1.1 }] },
  vignette: {
    id: 'vignette',
    displayName: 'Vignette',
    description: 'Gently darkens the outer frame to keep visual focus inside the view.',
    cpuSupported: true,
    parameters: [{ id: 'amount', label: 'Vignette', min: 0, max: 0.75, step: 0.05, defaultValue: 0 }],
  },
  grain: { id: 'grain', displayName: 'Grain', description: 'A very subtle deterministic texture for cinematic finishes.', cpuSupported: true, parameters: [{ id: 'amount', label: 'Grain', min: 0, max: 0.15, step: 0.01, defaultValue: 0 }] },
  colourGrade: { id: 'colourGrade', displayName: 'Colour grade', description: 'A restrained warm-highlight, cool-shadow grade.', cpuSupported: true, parameters: [{ id: 'amount', label: 'Colour grade', min: 0, max: 1, step: 0.05, defaultValue: 0 }] },
  sharpen: { id: 'sharpen', displayName: 'Sharpen', description: 'Restores a little local edge definition after the lens pass.', cpuSupported: false, parameters: [{ id: 'amount', label: 'Sharpen', min: 0, max: 0.5, step: 0.05, defaultValue: 0 }] },
  chromaticAberration: { id: 'chromaticAberration', displayName: 'Chromatic aberration', description: 'An experimental edge split; disabled unless deliberately enabled.', cpuSupported: false, parameters: [{ id: 'amount', label: 'Chromatic aberration', min: 0, max: 0.012, step: 0.001, defaultValue: 0 }] },
};

export function createLensConfig(exposure = 1, vignette = 0): LensConfig {
  return {
    effects: [
      { id: 'exposure', enabled: true, parameters: { amount: clamp(exposure, 0.1, 4, 1) } },
      { id: 'toneMapping', enabled: true, parameters: { amount: 1 } },
      { id: 'bloom', enabled: false, parameters: { amount: 0, threshold: 1.1 } },
      { id: 'vignette', enabled: vignette > 0, parameters: { amount: clamp(vignette, 0, 1, 0) } },
      { id: 'grain', enabled: false, parameters: { amount: 0 } },
      { id: 'colourGrade', enabled: false, parameters: { amount: 0 } },
      { id: 'sharpen', enabled: false, parameters: { amount: 0 } },
      { id: 'chromaticAberration', enabled: false, parameters: { amount: 0 } },
    ],
  };
}

export function cloneLensConfig(lens: LensConfig): LensConfig {
  return { effects: lens.effects.map((effect) => ({ ...effect, parameters: { ...effect.parameters } })) };
}

export function normalizeLensConfig(lens: LensConfig | undefined): LensConfig {
  if (!lens || !Array.isArray(lens.effects)) {
    return createLensConfig();
  }

  const effects = (Object.keys(lensEffectRegistry) as LensEffectId[]).map((id) => {
    const supplied = lens.effects.find((effect) => effect.id === id);
    const definition = lensEffectRegistry[id];
    const parameters = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.id,
      clamp(supplied?.parameters?.[parameter.id], parameter.min, parameter.max, parameter.defaultValue),
    ]));
    return { id, enabled: supplied?.enabled ?? (id === 'exposure' || id === 'toneMapping'), parameters };
  });

  return { effects };
}

export function getLensEffect(lens: LensConfig, id: LensEffectId): LensEffectConfig {
  return normalizeLensConfig(lens).effects.find((effect) => effect.id === id)!;
}

export function getLensEffectAmount(lens: LensConfig, id: LensEffectId): number {
  const effect = getLensEffect(lens, id);
  return effect.enabled ? (effect.parameters.amount ?? lensEffectRegistry[id].parameters[0].defaultValue) : 0;
}

export function updateLensEffect(
  lens: LensConfig,
  id: LensEffectId,
  parameters: Record<string, number>,
  enabled = true,
): LensConfig {
  const normalized = normalizeLensConfig(lens);
  return {
    effects: normalized.effects.map((effect) => effect.id === id
      ? { ...effect, enabled, parameters: { ...effect.parameters, ...parameters } }
      : effect),
  };
}

export function validateLensConfig(lens: LensConfig): string[] {
  const issues: string[] = [];
  for (const effect of lens.effects) {
    const definition = lensEffectRegistry[effect.id];
    if (!definition) {
      issues.push(`Unknown lens effect: ${effect.id}`);
      continue;
    }
    for (const parameter of definition.parameters) {
      const value = effect.parameters[parameter.id];
      if (!Number.isFinite(value) || value < parameter.min || value > parameter.max) {
        issues.push(`${definition.displayName} ${parameter.label} must be between ${parameter.min} and ${parameter.max}.`);
      }
    }
  }
  return issues;
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback;
}
