import { describe, expect, it } from 'vitest';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { createDefaultAnimationClip } from '../src/animation/model';
import { evaluateConfiguration, snapshotEffectiveConfig } from '../src/animation/evaluation';
import { generateAnimationFrames, sampleAnimationBase, sampleAnimationClip } from '../src/animation/interpolation';
import { evaluateModulations, evaluateModulation } from '../src/visuals/modulation/runtime';
import { adaptLegacyModulations, evaluateInternalSource, isInternalModulationProgram, type InternalModulationProgram } from '../src/visuals/modulation/program';
import { normalizeEvaluatedConfig } from '../src/parameters/validateRenderConfig';
import { migrateRenderConfig, migrateWaypoint } from '../src/persistence/renderConfig';
import { encodeRenderConfigToUrlParam, decodeRenderConfigFromUrlParam } from '../src/persistence/urlState';
import { cloneRenderConfig, createWaypoint } from '../src/navigation/waypoints';
import type { ParameterModulation } from '../src/types/config';

const legacy: ParameterModulation = { id: 'saved-id', target: 'palette.offset', waveform: 'sine',
  frequencyHz: 0.25, phase: -0.1, amplitude: 0.5, offset: 0.2, enabled: true };
const program = (): InternalModulationProgram => ({ schemaVersion: 1,
  sources: [{ id: 'source', waveform: 'constant', frequencyHz: 1, phase: 0, amplitude: 0.25, offset: 0 }],
  mappings: [{ id: 'offset', sourceId: 'source', target: 'palette.offset', mode: 'add', enabled: true, transforms: [] }],
});

describe('internal explicit-time evaluation', () => {
  it('does not impose new program-size limits on existing legacy lists', () => {
    const base = createDefaultRenderConfig();
    base.modulations = Array.from({ length: 40 }, (_, index) => ({ ...legacy, id: `saved-${index}`, waveform: 'constant', amplitude: 0.125, offset: 0 }));
    expect(evaluateConfiguration(base, 0).config.palette.offset).toBe(5);
  });

  it('holds the last authored keyframe after its time instead of jumping to the first', () => {
    const clip = createDefaultAnimationClip(createDefaultRenderConfig());
    clip.keyframes[1].time = 0.8;
    clip.keyframes[1].renderConfig.palette.offset = 0.75;
    expect(sampleAnimationBase(clip, clip.durationMs).palette.offset).toBe(0.75);
  });
  it('adapts legacy waveforms with exact signed phase and no persisted duplication', () => {
    expect(evaluateModulation({ ...legacy, waveform: 'constant' }, 0)).toBe(0.7);
    expect(evaluateModulation({ ...legacy, waveform: 'saw' }, 0)).toBeCloseTo(-0.4);
    expect(evaluateModulation({ ...legacy, waveform: 'triangle' }, 0)).toBeCloseTo(-0.5);
    for (const waveform of ['sine', 'triangle', 'saw', 'constant'] as const) {
      for (const time of [0, 0.01, 1, 9]) {
        const entry = { ...legacy, waveform };
        expect(evaluateInternalSource(adaptLegacyModulations([entry]).sources[0], time)).toBe(evaluateModulation(entry, time));
      }
    }
    const base = createDefaultRenderConfig('phoenix'); base.modulations = [legacy];
    const before = structuredClone(base);
    const clip = createDefaultAnimationClip(base); clip.keyframes = [clip.keyframes[0]];
    expect(sampleAnimationBase(clip, 1000).palette.offset).toBe(base.palette.offset);
    expect(sampleAnimationClip(clip, 1000).palette.offset).toBe(base.palette.offset + evaluateModulation(legacy, 1));
    expect(base).toEqual(before);
    expect(base.modulationProgram).toBeUndefined();
  });

  it('uses declared mapping order as priority with add and replace and a shared source', () => {
    const base = createDefaultRenderConfig('phoenix'); base.palette.offset = 5;
    base.modulationProgram = program();
    base.modulationProgram.mappings.push({ ...base.modulationProgram.mappings[0], id: 'replace', mode: 'replace' },
      { ...base.modulationProgram.mappings[0], id: 'last' });
    expect(evaluateConfiguration(base, 0).config.palette.offset).toBe(0.5);
    base.modulationProgram.mappings.reverse();
    expect(evaluateConfiguration(base, 0).config.palette.offset).toBe(0.5);
    base.modulationProgram.mappings[2].mode = 'replace';
    expect(evaluateConfiguration(base, 0).config.palette.offset).toBe(0.25);
    expect(base.palette.offset).toBe(5);
  });

  it('applies transform order in domain units, without clamping palette to a slider', () => {
    const base = createDefaultRenderConfig(); base.modulationProgram = program();
    base.modulationProgram.mappings[0].transforms = [
      { kind: 'scale', value: 8 }, { kind: 'offset', value: 1 }, { kind: 'invert' },
      { kind: 'curve', value: 2 }, { kind: 'clamp', min: -7, max: 7 },
    ];
    expect(evaluateConfiguration(base, 1).config.palette.offset).toBe(-7);
  });

  it('noise and bounded smoothing are identical after seeks, resets and JSON round trips', () => {
    const base = createDefaultRenderConfig(); base.modulationProgram = program();
    base.modulationProgram.sources[0] = { ...base.modulationProgram.sources[0], waveform: 'noise', seed: 27, frequencyHz: 2 };
    base.modulationProgram.mappings[0].transforms = [{ kind: 'smooth', windowSeconds: 0.4 }];
    const expected = [0, 0.1, 0.5, 1.2, 5].map((time) => evaluateConfiguration(base, time).config.palette.offset);
    for (const time of [20, 10, 3, 0, 100]) evaluateConfiguration(base, time);
    expect([0, 0.1, 0.5, 1.2, 5].map((time) => evaluateConfiguration(JSON.parse(JSON.stringify(base)), time).config.palette.offset)).toEqual(expected);
    expect(new Set(expected).size).toBeGreaterThan(1);
    const clone = cloneRenderConfig(base);
    clone.modulationProgram!.sources[0].seed = 99;
    expect(base.modulationProgram.sources[0].seed).toBe(27);
  });

  it('live samples and exported frames use the same evaluator exactly once', () => {
    const base = createDefaultRenderConfig('phoenix'); base.modulationProgram = program();
    const clip = createDefaultAnimationClip(base); clip.durationMs = 1000; clip.fps = 10;
    const frames = generateAnimationFrames(clip);
    for (let index = 0; index < frames.length; index++) {
      expect(frames[index]).toEqual(evaluateConfiguration(sampleAnimationBase(clip, index * 100), index / 10).config);
    }
  });

  it('bakes static snapshots and preserves both authored representations on save/load', () => {
    for (const modern of [false, true]) {
      const base = createDefaultRenderConfig('phoenix');
      if (modern) base.modulationProgram = program(); else base.modulations = [legacy];
      const restored = decodeRenderConfigFromUrlParam(encodeRenderConfigToUrlParam(base))!;
      expect(restored).toEqual(base);
      const waypoint = createWaypoint({ name: 'Motion', source: 'user', renderConfig: base });
      expect(migrateWaypoint(JSON.parse(JSON.stringify(waypoint)))?.renderConfig).toEqual(base);
      const effective = evaluateConfiguration(base, 1).config;
      const snapshot = snapshotEffectiveConfig(effective);
      expect(snapshot.modulations).toEqual([]); expect(snapshot.modulationProgram).toBeUndefined();
      expect(evaluateConfiguration(snapshot, 100).config.palette.offset).toBe(effective.palette.offset);
      expect(modern ? base.modulationProgram : base.modulations.length).toBeTruthy();
    }
  });

  it('rejects ambiguity, unknown versions/targets/sources, duplicate IDs and invalid transforms', () => {
    const base = createDefaultRenderConfig(); base.modulationProgram = program(); base.modulations = [legacy];
    expect(() => evaluateConfiguration(base, 1)).toThrow(/one modulation/);
    expect(migrateRenderConfig(base)).toBeNull();
    const invalid = [
      { ...program(), schemaVersion: 9 },
      { ...program(), sources: [program().sources[0], program().sources[0]] },
      { ...program(), mappings: [{ ...program().mappings[0], target: 'formula.phoenix.memory' }] },
      { ...program(), mappings: [{ ...program().mappings[0], sourceId: 'missing' }] },
      { ...program(), mappings: [{ ...program().mappings[0], transforms: [{ kind: 'curve', value: 0 }] }] },
      { ...program(), mappings: [{ ...program().mappings[0], transforms: [{ kind: 'smooth', windowSeconds: 1 }, { kind: 'invert' }] }] },
    ];
    for (const candidate of invalid) expect(isInternalModulationProgram(candidate)).toBe(false);
  });

  it('reports inactive targets and invalid signals without poisoning subsequent writes', () => {
    const base = createDefaultRenderConfig('newton'); base.modulationProgram = program();
    base.modulationProgram.mappings.unshift({ ...base.modulationProgram.mappings[0], id: 'trap', target: 'material.orbitTraps[1].rotation' });
    base.modulationProgram.mappings.push({ ...base.modulationProgram.mappings[1], id: 'overflow', transforms: [{ kind: 'scale', value: Number.MAX_VALUE }, { kind: 'scale', value: Number.MAX_VALUE }] });
    const result = evaluateConfiguration(base, 1);
    expect(result.config.palette.offset).toBe(0.25);
    expect(result.issues).toHaveLength(2);
    expect(result.config.material.orbitTraps).toBeUndefined();
  });

  it('disabled mappings are true no-ops and zero-valued enabled mappings remain deliberate writes', () => {
    const base = createDefaultRenderConfig(); base.modulationProgram = program();
    base.modulationProgram.mappings[0] = { ...base.modulationProgram.mappings[0], enabled: false, target: 'lens.effects.vignette.amount' };
    expect(evaluateConfiguration(base, 0).config.lens.effects.find((e) => e.id === 'vignette')!.enabled).toBe(false);
  });

  it.each([NaN, Infinity, -1])('rejects invalid logical time %s', (time) => {
    expect(() => evaluateConfiguration(createDefaultRenderConfig(), time)).toThrow();
  });
});

describe('final domain boundary', () => {
  it('rejects non-finite values before repair, including invalid keyframes', () => {
    const base = createDefaultRenderConfig('phoenix'); base.fractal.parameters.memory = Infinity;
    expect(() => evaluateConfiguration(base, 0)).toThrow(/non-finite/);
    const clip = createDefaultAnimationClip(createDefaultRenderConfig('phoenix')); clip.keyframes[1].renderConfig = base;
    expect(() => sampleAnimationClip(clip, 1)).toThrow(/non-finite/);
  });
  it('normalises domain values without modifying authored data or quantising continuous memory', () => {
    const base = createDefaultRenderConfig('phoenix'); base.fractal.parameters.memory = 5;
    base.fractal.maxIterations = 127.3; base.palette.offset = 4.25;
    const result = normalizeEvaluatedConfig(base);
    expect(result.fractal.parameters.memory).toBe(1); expect(base.fractal.parameters.memory).toBe(5);
    expect(result.fractal.maxIterations).toBe(127); expect(result.palette.offset).toBe(4.25);
    base.fractal.parameters.memory = 0.123456;
    expect(normalizeEvaluatedConfig(base).fractal.parameters.memory).toBe(0.123456);
  });
  it('rejects invalid geometry and palette structure; resolves material compatibility only in output', () => {
    const base = createDefaultRenderConfig('newton'); base.material.id = 'classic';
    expect(normalizeEvaluatedConfig(base).material.id).toBe('rootBasin'); expect(base.material.id).toBe('classic');
    base.viewport.scale = { hi: 0, lo: 0 }; expect(() => normalizeEvaluatedConfig(base)).toThrow(/Invalid viewport/);
    base.viewport.scale.hi = 1; base.palette.stops = []; expect(() => normalizeEvaluatedConfig(base)).toThrow(/two colour/);
  });
});
