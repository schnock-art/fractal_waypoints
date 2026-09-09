import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { createDefaultAnimationClip } from '../src/animation/model';
import { summarizeJourneyWorkspace } from '../src/animation/workspace';

describe('journey workspace helpers', () => {
  it('summarizes clip timing and frame counts', () => {
    const clip = createDefaultAnimationClip(createDefaultRenderConfig('mandelbrot'));
    clip.durationMs = 3_000;
    clip.fps = 24;

    const summary = summarizeJourneyWorkspace(clip, 73, []);

    expect(summary.keyframeCount).toBe(clip.keyframes.length);
    expect(summary.durationSeconds).toBe('3.00');
    expect(summary.exportFrameCount).toBe(73);
  });

  it('reports recording activity when navigation capture exists', () => {
    const clip = createDefaultAnimationClip(createDefaultRenderConfig('julia'));
    const summary = summarizeJourneyWorkspace(clip, 61, [
      { timestampMs: 0, action: 'moveUp', phase: 'start' },
      { timestampMs: 240, action: 'moveUp', phase: 'end' },
    ]);

    expect(summary.recordingSummary).toContain('2 navigation events');
  });
});
