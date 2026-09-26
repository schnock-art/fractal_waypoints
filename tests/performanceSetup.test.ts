import { beforeEach, describe, expect, it } from 'vitest';
import { rangeTransforms, type ExternalControlRelationship } from '../src/connections/externalControl';
import { clearPerformanceControlSetup, createPerformanceControlSetup, exportPerformanceControlSetup,
  importPerformanceControlSetup, isPerformanceControlSetup, loadPerformanceControlSetup, PERFORMANCE_SETUP_STORAGE_KEY,
  savePerformanceControlSetup, type PerformanceControlBinding } from '../src/connections/performanceSetup';

function relation(target: 'zoom' | 'palette.offset' | 'formula.julia.cReal', learned = false): ExternalControlRelationship {
  const sourceId = learned ? 'learned:cc:126:ch1' : 'hydrasynth:macro.1:cc:16:ch1';
  return {
    source: { schemaVersion: 1, id: sourceId, kind: 'absolute-control', deviceProfileId: learned ? 'learned-midi-control' : 'asm-hydrasynth-explorer-2.2',
      controlId: learned ? 'cc:126' : 'macro.1', address: { protocol: 'midi-cc', controller: learned ? 126 : 16 }, channel: 0, minimum: 0, maximum: 127 },
    mapping: { schemaVersion: 1, id: target, sourceId, enabled: true,
      target: target === 'zoom' ? { kind: 'navigation-intent', id: 'zoom', mode: 'continuous' }
        : { kind: 'semantic-parameter', id: target },
      transforms: target === 'zoom' ? rangeTransforms(0, 127, -1, 1) : rangeTransforms(0, 127, -2, 3, true, 2) },
  };
}

const bindings = (): PerformanceControlBinding[] => [
  { id: 'zoom', target: 'zoom', relationship: relation('zoom'), settings: { kind: 'zoom', mode: 'continuous' } },
  { id: 'palette.offset', target: 'palette.offset', relationship: relation('palette.offset', true),
    settings: { kind: 'range', minimum: -2, maximum: 3, inverted: true, curve: 2 } },
];

describe('performance control setup', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips profiled and learned controls without runtime or world state', () => {
    const setup = createPerformanceControlSetup(bindings(), 'Explorer live setup');
    expect(setup.deviceProfiles).toEqual([
      { id: 'asm-hydrasynth-explorer-2.2', kind: 'profile' },
      { id: 'learned-midi-control', kind: 'learned' },
    ]);
    const json = exportPerformanceControlSetup(setup);
    expect(importPerformanceControlSetup(json)).toEqual({ status: 'loaded', setup });
    expect(json).not.toContain('selectedId');
    expect(json).not.toContain('renderConfig');
    expect(json).not.toContain('armed');
    expect(json).not.toContain('liveValue');
  });

  it('persists locally and clears independently from other storage', () => {
    const setup = createPerformanceControlSetup(bindings());
    window.localStorage.setItem('fractal-explorer:waypoints:v1', '[{"keep":true}]');
    expect(savePerformanceControlSetup(setup)).toBe(true);
    expect(loadPerformanceControlSetup()).toEqual({ status: 'loaded', setup });
    clearPerformanceControlSetup();
    expect(loadPerformanceControlSetup().status).toBe('empty');
    expect(window.localStorage.getItem('fractal-explorer:waypoints:v1')).toBe('[{"keep":true}]');
  });

  it('preserves a Julia coordinate relationship in the same independent setup format', () => {
    const juliaRelationship = relation('formula.julia.cReal');
    juliaRelationship.mapping.transforms = rangeTransforms(0, 127, -2, 2);
    const julia: PerformanceControlBinding = { id: 'formula.julia.cReal', target: 'formula.julia.cReal', relationship: juliaRelationship,
      settings: { kind: 'range', minimum: -2, maximum: 2, inverted: false, curve: 1 } };
    const setup = createPerformanceControlSetup([...bindings(), julia]);
    expect(importPerformanceControlSetup(exportPerformanceControlSetup(setup))).toEqual({ status: 'loaded', setup });
  });

  it('rejects mismatched editor settings, duplicate targets and missing profile references', () => {
    const valid = createPerformanceControlSetup(bindings());
    expect(isPerformanceControlSetup({ ...valid, bindings: [...valid.bindings, { ...valid.bindings[0], id: 'again' }] })).toBe(false);
    expect(isPerformanceControlSetup({ ...valid, deviceProfiles: valid.deviceProfiles.slice(1) })).toBe(false);
    const mismatched = structuredClone(valid); (mismatched.bindings[1].settings as { curve: number }).curve = 3;
    expect(isPerformanceControlSetup(mismatched)).toBe(false);
  });

  it('remains valid after removing one binding while keeping the other setup relationships', () => {
    const setup = createPerformanceControlSetup(bindings());
    const remaining = createPerformanceControlSetup(setup.bindings.filter((binding) => binding.target !== 'palette.offset'));
    expect(remaining.bindings.map((binding) => binding.target)).toEqual(['zoom']);
    expect(isPerformanceControlSetup(remaining)).toBe(true);
  });

  it('leaves a future stored version untouched and reports it explicitly', () => {
    const future = JSON.stringify({ schemaVersion: 7, name: 'Future', deviceProfiles: [], bindings: [] });
    window.localStorage.setItem(PERFORMANCE_SETUP_STORAGE_KEY, future);
    expect(loadPerformanceControlSetup()).toEqual({ status: 'unsupported', message: 'Controller setup version 7 is newer than this app supports. It was not changed.' });
    expect(window.localStorage.getItem(PERFORMANCE_SETUP_STORAGE_KEY)).toBe(future);
  });

  it('rejects malformed JSON without replacing the last valid setup', () => {
    const setup = createPerformanceControlSetup(bindings()); savePerformanceControlSetup(setup);
    expect(importPerformanceControlSetup('{broken').status).toBe('invalid');
    expect(loadPerformanceControlSetup()).toEqual({ status: 'loaded', setup });
  });
});
