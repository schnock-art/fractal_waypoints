import { describe, expect, it } from 'vitest';
import { applySignalTransforms } from '../src/connections/signalTransforms';
import { deriveRelativeNavigationIntent, ExternalControlFrameBuffer, isExternalControlRelationship,
  rangeTransforms, routeExternalControl, type ExternalControlRelationship } from '../src/connections/externalControl';

const relationship = (target: ExternalControlRelationship['mapping']['target'], transforms = rangeTransforms(0, 127, -1, 1)): ExternalControlRelationship => ({
  source: { schemaVersion: 1, id: 'hydrasynth:macro.1:cc:16:ch1', kind: 'absolute-control',
    deviceProfileId: 'asm-hydrasynth-explorer-2.2', controlId: 'macro.1', address: { protocol: 'midi-cc', controller: 16 },
    channel: 0, minimum: 0, maximum: 127 },
  mapping: { schemaVersion: 1, id: 'mapping', sourceId: 'hydrasynth:macro.1:cc:16:ch1', enabled: true, transforms, target },
});

describe('external control boundary', () => {
  it('uses the shared transform vocabulary for a semantic absolute value', () => {
    const transforms = rangeTransforms(0, 127, -2, 3, true, 2);
    const relation = relationship({ kind: 'semantic-parameter', id: 'palette.offset' }, transforms);
    expect(isExternalControlRelationship(JSON.parse(JSON.stringify(relation)))).toBe(true);
    const output = routeExternalControl(relation, { sourceId: relation.source.id, value: 0, timestamp: 12 });
    expect(output).toEqual({ kind: 'semantic-value', target: 'palette.offset', value: 3, timestamp: 12 });
    expect(applySignalTransforms(127, transforms)).toBe(-2);
  });

  it('keeps navigation intents distinct from semantic parameter writes', () => {
    const continuous = relationship({ kind: 'navigation-intent', id: 'zoom', mode: 'continuous' });
    expect(routeExternalControl(continuous, { sourceId: continuous.source.id, value: 63.5, timestamp: 1 }))
      .toEqual({ kind: 'navigation-rate', target: 'zoom', value: 0, timestamp: 1 });
    expect((routeExternalControl(continuous, { sourceId: continuous.source.id, value: 127, timestamp: 2 }) as { value: number }).value).toBe(1);

    const turn = relationship({ kind: 'navigation-intent', id: 'zoom', mode: 'turn' }, rangeTransforms(0, 127, 0, 127));
    const first = routeExternalControl(turn, { sourceId: turn.source.id, value: 40, timestamp: 3 })!;
    const second = routeExternalControl(turn, { sourceId: turn.source.id, value: 55, timestamp: 4 })!;
    expect(deriveRelativeNavigationIntent(null, first)).toBeNull();
    expect(deriveRelativeNavigationIntent(40, second)).toEqual({ kind: 'relative-navigation-intent', target: 'zoom', delta: 15, timestamp: 4 });

    const highResolutionTurn = { ...turn, source: { ...turn.source, maximum: 1024 }, mapping: {
      ...turn.mapping, transforms: rangeTransforms(0, 1024, 0, 127),
    } };
    expect((routeExternalControl(highResolutionTurn, { sourceId: turn.source.id, value: 600, timestamp: 5 }) as { value: number }).value).toBe(74);
  });

  it('coalesces absolute updates once per frame, rejects stale samples and stays bounded', () => {
    const buffer = new ExternalControlFrameBuffer(2);
    expect(buffer.push({ sourceId: 'a', value: 1, timestamp: 1 })).toBe(true);
    expect(buffer.push({ sourceId: 'a', value: 2, timestamp: 2 })).toBe(true);
    expect(buffer.push({ sourceId: 'a', value: 9, timestamp: 1 })).toBe(false);
    expect(buffer.push({ sourceId: 'b', value: 3, timestamp: 2 })).toBe(true);
    expect(buffer.push({ sourceId: 'c', value: 4, timestamp: 2 })).toBe(false);
    expect(buffer.drain()).toEqual([{ sourceId: 'a', value: 2, timestamp: 2 }, { sourceId: 'b', value: 3, timestamp: 2 }]);
    expect(buffer.diagnostics()).toEqual({ received: 5, emitted: 2, coalesced: 1, stale: 1, overflow: 1 });
    buffer.reset();
    expect(buffer.push({ sourceId: 'a', value: 0, timestamp: 0 })).toBe(true);
  });

  it('rejects malformed identities, unsupported targets and history smoothing', () => {
    const valid = relationship({ kind: 'semantic-parameter', id: 'palette.offset' });
    expect(isExternalControlRelationship({ ...valid, source: { ...valid.source, channel: 16 } })).toBe(false);
    expect(isExternalControlRelationship({ ...valid, mapping: { ...valid.mapping, target: { kind: 'semantic-parameter', id: 'unknown' } } })).toBe(false);
    expect(isExternalControlRelationship({ ...valid, mapping: { ...valid.mapping, transforms: [{ kind: 'smooth', windowSeconds: 1 }] } })).toBe(false);
  });
});
