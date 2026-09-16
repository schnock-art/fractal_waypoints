import { describe, expect, it } from 'vitest';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { evaluateConfiguration, snapshotEffectiveConfig } from '../src/animation/evaluation';
import { applyPerformanceOverrides, commitPerformanceProgram, movePerformanceMapping } from '../src/performance/model';
import type { InternalModulationProgram } from '../src/visuals/modulation/program';
import { evaluateModulations } from '../src/visuals/modulation/runtime';

const program = (): InternalModulationProgram => ({ schemaVersion: 1,
  sources: [{ id: 'wave', waveform: 'constant', amplitude: 0.25, offset: 0, phase: 0, frequencyHz: 1 }],
  mappings: [{ id: 'add', sourceId: 'wave', target: 'palette.offset', mode: 'add', enabled: true, transforms: [] },
    { id: 'replace', sourceId: 'wave', target: 'palette.offset', mode: 'replace', enabled: true, transforms: [] }],
});

describe('bounded Perform composition', () => {
  it('applies absolute semantic overrides after a single modulation, without touching base', () => {
    const base = commitPerformanceProgram(createDefaultRenderConfig('phoenix'), program());
    const copy = structuredClone(base);
    const evaluated = evaluateConfiguration(base, 2).config;
    const overridden = applyPerformanceOverrides(evaluated, { 'palette.offset': 2.75, 'formula.phoenix.memory': 1.5 });
    expect(overridden.palette.offset).toBe(2.75);
    expect(overridden.fractal.parameters.memory).toBe(1);
    expect(base).toEqual(copy);
    expect(applyPerformanceOverrides(evaluated, {}).palette.offset).toBe(0.25);
    expect(snapshotEffectiveConfig(overridden).modulationProgram).toBeUndefined();
  });
  it('never reroutes an unavailable Phoenix override and rejects invalid writes', () => {
    const base = createDefaultRenderConfig('newton');
    expect(applyPerformanceOverrides(base, { 'formula.phoenix.memory': 0.2 }).fractal).toEqual(base.fractal);
    expect(() => applyPerformanceOverrides(base, { 'palette.offset': Infinity })).toThrow('finite');
  });
  it('moves only mapping order, retaining shared source identity and visible composition', () => {
    const original = program(); const moved = movePerformanceMapping(original, 1, -1);
    expect(original.mappings[0].id).toBe('add');
    expect(moved.sources).toEqual(original.sources);
    expect(moved.mappings.map((entry) => entry.id)).toEqual(['replace', 'add']);
    expect(evaluateConfiguration(commitPerformanceProgram(createDefaultRenderConfig(), moved), 0).config.palette.offset).toBe(0.5);
    expect(movePerformanceMapping(original, 0, -1)).toEqual(original);
  });
  it('explicit conversion has one canonical owner and validates before committing', () => {
    const base = createDefaultRenderConfig();
    base.modulations = [{ id: 'saved', target: 'palette.offset', waveform: 'constant', amplitude: 1, offset: 0, phase: 0, frequencyHz: 1, enabled: true }];
    const authored = program(); const committed = commitPerformanceProgram(base, authored);
    authored.sources[0].amplitude = 999;
    expect(committed.modulations).toEqual([]);
    expect(base.modulations[0].id).toBe('saved');
    expect(committed.modulationProgram?.sources[0].amplitude).toBe(0.25);
    expect(() => commitPerformanceProgram(base, { ...program(), schemaVersion: 2 } as unknown as InternalModulationProgram)).toThrow('Invalid program');
  });
  it('provides ordered active, disabled, inactive and invalid diagnostics from actual evaluation', () => {
    const p = program();
    p.sources.push({ id: 'overflow', waveform: 'constant', amplitude: 1e308, offset: 1e308, phase: 0, frequencyHz: 0 });
    p.mappings.push({ ...p.mappings[0], id: 'off', enabled: false },
      { ...p.mappings[0], id: 'missing', target: 'material.orbitAppearance.emission' },
      { ...p.mappings[0], id: 'bad', sourceId: 'overflow' });
    const result = evaluateModulations(commitPerformanceProgram(createDefaultRenderConfig(), p), 0);
    expect(result.mappings.map((entry) => entry.status)).toEqual(['active', 'active', 'disabled', 'inactive', 'invalid']);
    expect(result.mappings[1]).toMatchObject({ before: 0.25, signal: 0.25, after: 0.25 });
    expect(result.issues).toHaveLength(2);
  });
});
