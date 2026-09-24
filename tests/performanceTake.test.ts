import { beforeEach, describe, expect, it } from 'vitest';
import { rangeTransforms, type ExternalControlRelationship } from '../src/connections/externalControl';
import { clearPerformanceControlTake, createPerformanceControlTake, isPerformanceControlTake, loadPerformanceControlTake,
  PERFORMANCE_TAKE_STORAGE_KEY, savePerformanceControlTake } from '../src/connections/performanceTake';

const relationship: ExternalControlRelationship = {
  source: { schemaVersion: 1, id: 'learned:cc:126:ch1', kind: 'absolute-control', deviceProfileId: 'learned-midi-control',
    controlId: 'cc:126', address: { protocol: 'midi-cc', controller: 126 }, channel: 0, minimum: 0, maximum: 127 },
  mapping: { schemaVersion: 1, id: 'palette:learned:cc:126:ch1', sourceId: 'learned:cc:126:ch1', enabled: true,
    target: { kind: 'semantic-parameter', id: 'palette.offset' }, transforms: rangeTransforms(0, 127, -1, 1) },
};

describe('performance control take', () => {
  beforeEach(() => window.localStorage.clear());

  it('creates an ordered, self-contained logical input sequence', () => {
    const take = createPerformanceControlTake([relationship], [
      { atMs: 120, sourceId: relationship.source.id, value: 127 },
      { atMs: 0, sourceId: relationship.source.id, value: 0 },
    ], 120, 'Palette sweep');
    expect(take.events.map((event) => event.atMs)).toEqual([0, 120]);
    expect(take.relationships[0]).toEqual(relationship);
    expect(JSON.stringify(take)).not.toContain('selectedId');
    expect(JSON.stringify(take)).not.toContain('renderConfig');
    expect(JSON.stringify(take)).not.toContain('armed');
  });

  it('persists independently from the controller setup and rejects malformed ordering', () => {
    const take = createPerformanceControlTake([relationship], [{ atMs: 4, sourceId: relationship.source.id, value: 64 }], 10);
    window.localStorage.setItem('fractal-explorer:performance-setup:v1', '{"keep":true}');
    expect(savePerformanceControlTake(take)).toBe(true);
    expect(loadPerformanceControlTake()).toEqual({ status: 'loaded', take });
    clearPerformanceControlTake();
    expect(loadPerformanceControlTake().status).toBe('empty');
    expect(window.localStorage.getItem('fractal-explorer:performance-setup:v1')).toBe('{"keep":true}');
    expect(isPerformanceControlTake({ ...take, events: [...take.events, { atMs: 3, sourceId: relationship.source.id, value: 0 }] })).toBe(false);
  });

  it('reports a future stored version without changing it', () => {
    const future = JSON.stringify({ schemaVersion: 8, name: 'Future', durationMs: 0, relationships: [], events: [] });
    window.localStorage.setItem(PERFORMANCE_TAKE_STORAGE_KEY, future);
    expect(loadPerformanceControlTake()).toEqual({ status: 'unsupported', message: 'Performance take version 8 is newer than this app supports. It was not changed.' });
    expect(window.localStorage.getItem(PERFORMANCE_TAKE_STORAGE_KEY)).toBe(future);
  });
});
