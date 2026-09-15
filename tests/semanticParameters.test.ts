import { describe, expect, it } from 'vitest';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { describeSemanticParameter, readSemanticParameter, writeSemanticParameter } from '../src/parameters/semantic';
import { normalizePhoenixParameters, phoenixMemoryParameter, setPhoenixMemory } from '../src/fractals/phoenix';
import { paletteOffsetParameter, setPaletteOffset } from '../src/palettes/offset';
import { encodeRenderConfigToUrlParam, decodeRenderConfigFromUrlParam } from '../src/persistence/urlState';
import { migrateWaypoint } from '../src/persistence/renderConfig';
import { createWaypoint } from '../src/navigation/waypoints';
import { interpolateRenderConfigs, sampleAnimationClip } from '../src/animation/interpolation';
import { createDefaultAnimationClip } from '../src/animation/model';
import { applyModulations } from '../src/visuals/modulation/runtime';

const memory = 'formula.phoenix.memory';
const offset = 'palette.offset';

describe('two-target semantic pressure test', () => {
  it('exposes domain-owned metadata, not a generic object path or UI catalogue', () => {
    expect(describeSemanticParameter(memory)).toBe(phoenixMemoryParameter);
    expect(describeSemanticParameter(offset)).toBe(paletteOffsetParameter);
    expect(phoenixMemoryParameter).toMatchObject({ owner: { kind: 'formula', id: 'phoenix' },
      bounds: { min: -1, max: 1 }, defaultValue: -0.5, interpolation: 'linear', modulationEligible: true });
    expect(paletteOffsetParameter).toMatchObject({ bounds: null, defaultValue: 0, unit: 'palette-coordinate' });
    for (const id of ['fractal.parameters.memory', '__proto__', 'toString', 'palette.scale']) {
      expect(describeSemanticParameter(id)).toBeUndefined();
      const config = createDefaultRenderConfig('phoenix');
      expect(writeSemanticParameter(config, id, 1)).toMatchObject({ status: 'unknown', config });
    }
  });

  it('guards formula identity even when an unrelated parameter map contains memory', () => {
    for (const formula of ['newton', 'julia', 'mandelbrot'] as const) {
      const config = createDefaultRenderConfig(formula);
      config.fractal.parameters.memory = 0.8;
      expect(readSemanticParameter(config, memory)).toMatchObject({ status: 'inactive', reason: expect.any(String) });
      const result = writeSemanticParameter(config, memory, 0);
      expect(result.status).toBe('inactive');
      expect(result.config).toBe(config);
      expect(readSemanticParameter(config, offset).status).toBe('available');
    }
  });

  it.each([NaN, Infinity, -Infinity, '0.5', null, undefined])('rejects invalid input %s without mutation', (value) => {
    const config = createDefaultRenderConfig('phoenix');
    for (const id of [memory, offset]) {
      const result = writeSemanticParameter(config, id, value);
      expect(result.status).toBe('invalid');
      expect(result.config).toBe(config);
    }
  });

  it('clamps memory continuously without quantising to the slider step or rewriting siblings', () => {
    const config = createDefaultRenderConfig('phoenix');
    const before = structuredClone(config);
    const result = writeSemanticParameter(config, memory, 0.123456);
    expect(result).toMatchObject({ status: 'applied', value: 0.123456 });
    expect(result.config.fractal.parameters.cReal).toBe(config.fractal.parameters.cReal);
    expect(result.config.palette).toBe(config.palette);
    expect(config).toEqual(before);
    for (const value of [-99, 99]) {
      const written = writeSemanticParameter(config, memory, value);
      expect(written.config.fractal.parameters.memory).toBe(normalizePhoenixParameters({ memory: value }).memory);
    }
    expect(setPhoenixMemory(config.fractal, NaN)).toBe(config.fractal);
  });

  it.each(['repeat', 'mirror', 'clamp'] as const)('preserves unwrapped offset for %s', (repeatMode) => {
    const config = createDefaultRenderConfig('phoenix');
    config.palette.repeatMode = repeatMode;
    for (const value of [-7.25, 4.125]) {
      const result = writeSemanticParameter(config, offset, value);
      expect(result).toMatchObject({ status: 'applied', value });
      expect(result.config.palette.offset).toBe(value);
      expect(result.config.fractal).toBe(config.fractal);
      expect(result.config.palette.stops).toBe(config.palette.stops);
    }
    expect(setPaletteOffset(config.palette, Infinity)).toBe(config.palette);
  });

  it('uses domain read defaults for incomplete values without repairing the input in place', () => {
    const config = createDefaultRenderConfig('phoenix');
    delete config.fractal.parameters.memory;
    config.palette.offset = NaN;
    expect(readSemanticParameter(config, memory)).toEqual({ status: 'available', value: -0.5 });
    expect(readSemanticParameter(config, offset)).toEqual({ status: 'available', value: 0 });
    expect(config.fractal.parameters.memory).toBeUndefined();
    expect(config.palette.offset).toBeNaN();
  });

  it('round-trips edited configs and existing modulation IDs through URLs and Waypoints', () => {
    let config = createDefaultRenderConfig('phoenix');
    config = writeSemanticParameter(config, memory, -0.4321).config;
    config = writeSemanticParameter(config, offset, 3.75).config;
    config.modulations = [{ id: 'legacy-offset', target: offset, waveform: 'constant', amplitude: 0.25,
      frequencyHz: 1, phase: 0, offset: 0, enabled: true }];
    expect(decodeRenderConfigFromUrlParam(encodeRenderConfigToUrlParam(config))).toEqual(config);
    const waypoint = createWaypoint({ name: 'Semantic test', renderConfig: config, source: 'user', tags: [] });
    expect(migrateWaypoint(JSON.parse(JSON.stringify(waypoint)))?.renderConfig).toEqual(config);
    expect(JSON.stringify(config)).not.toContain(memory);
  });

  it('shares domain values with Journey and existing palette modulation without accumulating', () => {
    let start = createDefaultRenderConfig('phoenix');
    start = writeSemanticParameter(start, memory, -0.8).config;
    start = writeSemanticParameter(start, offset, 2).config;
    let end = writeSemanticParameter(start, memory, 0.4).config;
    end = writeSemanticParameter(end, offset, 4).config;
    const mid = interpolateRenderConfigs(start, end, 0.5);
    expect(mid.fractal.parameters.memory).toBeCloseTo(-0.2);
    expect(mid.palette.offset).toBe(3);
    start.modulations = [{ id: 'legacy', target: offset, waveform: 'constant', amplitude: 0.5,
      frequencyHz: 1, phase: 0, offset: 0, enabled: true }];
    const before = structuredClone(start);
    const clip = createDefaultAnimationClip(start);
    clip.keyframes = [{ id: 'one', label: 'One', time: 0, renderConfig: start }];
    expect(sampleAnimationClip(clip, 1000).palette.offset).toBe(2.5);
    expect(applyModulations(start, 1)).toEqual(applyModulations(start, 1));
    expect(start).toEqual(before);
    start.modulations[0].amplitude = Number.MAX_VALUE;
    start.palette.offset = Number.MAX_VALUE;
    expect(applyModulations(start, 1).palette.offset).toBe(Number.MAX_VALUE);
  });
});
