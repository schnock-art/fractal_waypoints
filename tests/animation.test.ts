import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { generateAnimationFrames, interpolateRenderConfigs, sampleAnimationClip } from '../src/animation/interpolation';
import { createDefaultAnimationClip, createJourneyFromWaypoints } from '../src/animation/model';
import { buildClipFromRecordedNavigation } from '../src/animation/recording';
import { complexFromNumbers } from '../src/math/complex';
import { fromNumber, toNumber } from '../src/math/doubleSingle';
import { createDefaultNavigationSettings } from '../src/navigation/settings';
import { createWaypoint } from '../src/navigation/waypoints';

describe('animation interpolation', () => {
  it('interpolates viewport centers and zoom logarithmically', () => {
    const start = createDefaultRenderConfig('mandelbrot');
    const end = createDefaultRenderConfig('mandelbrot');
    start.viewport.centre = complexFromNumbers(-0.75, 0);
    start.viewport.scale = fromNumber(2.8);
    end.viewport.centre = complexFromNumbers(-0.5, 0.25);
    end.viewport.scale = fromNumber(0.028);

    const mid = interpolateRenderConfigs(start, end, 0.5);

    expect(toNumber(mid.viewport.centre.re)).toBeCloseTo(-0.625, 12);
    expect(toNumber(mid.viewport.centre.im)).toBeCloseTo(0.125, 12);
    expect(toNumber(mid.viewport.scale)).toBeCloseTo(Math.sqrt(2.8 * 0.028), 10);
  });

  it('samples a clip and generates deterministic frame counts', () => {
    const clip = createDefaultAnimationClip(createDefaultRenderConfig('julia'));
    clip.durationMs = 2_000;
    clip.fps = 20;
    clip.keyframes[1] = {
      ...clip.keyframes[1],
      renderConfig: {
        ...clip.keyframes[1].renderConfig,
        viewport: {
          ...clip.keyframes[1].renderConfig.viewport,
          scale: fromNumber(0.3),
        },
      },
    };

    const sampled = sampleAnimationClip(clip, 1_000);
    const frames = generateAnimationFrames(clip);

    expect(toNumber(sampled.viewport.scale)).toBeGreaterThan(0.3);
    expect(frames).toHaveLength(41);
  });
});

describe('journey builders', () => {
  it('builds a clip from waypoints', () => {
    const start = createWaypoint({
      name: 'A',
      renderConfig: createDefaultRenderConfig('mandelbrot'),
      source: 'user',
    });
    const endConfig = createDefaultRenderConfig('julia');
    endConfig.viewport.scale = fromNumber(0.22);
    const end = createWaypoint({
      name: 'B',
      renderConfig: endConfig,
      source: 'user',
    });

    const clip = createJourneyFromWaypoints(start, end);

    expect(clip.keyframes).toHaveLength(2);
    expect(clip.name).toContain('A');
    expect(toNumber(clip.keyframes[1].renderConfig.viewport.scale)).toBeCloseTo(0.22, 12);
  });

  it('converts recorded navigation into a clip', () => {
    const base = createDefaultRenderConfig('mandelbrot');
    const settings = createDefaultNavigationSettings();
    const clip = buildClipFromRecordedNavigation(base, settings, [
      { timestampMs: 0, action: 'moveUp', phase: 'start' },
      { timestampMs: 500, action: 'moveUp', phase: 'end' },
      { timestampMs: 700, action: 'zoomIn', phase: 'start' },
      { timestampMs: 1_000, action: 'zoomIn', phase: 'end' },
    ]);

    expect(clip).not.toBeNull();
    expect(clip?.keyframes.length).toBeGreaterThan(2);
    expect(toNumber(clip?.keyframes[clip.keyframes.length - 1].renderConfig.viewport.scale ?? fromNumber(1))).toBeLessThan(2.8);
  });
});
