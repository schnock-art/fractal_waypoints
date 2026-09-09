import type { AnimationClip, RecordedNavigationEvent } from '../types/config';

export interface JourneyWorkspaceSummary {
  keyframeCount: number;
  durationSeconds: string;
  exportFrameCount: number;
  recordingSummary: string;
}

export function summarizeJourneyWorkspace(
  clip: AnimationClip,
  frameCount: number,
  recordedEvents: RecordedNavigationEvent[],
): JourneyWorkspaceSummary {
  return {
    keyframeCount: clip.keyframes.length,
    durationSeconds: (clip.durationMs / 1000).toFixed(2),
    exportFrameCount: frameCount,
    recordingSummary: recordedEvents.length > 0
      ? `${recordedEvents.length} navigation events captured`
      : 'No navigation capture yet',
  };
}
