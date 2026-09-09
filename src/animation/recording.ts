import { applyNavigationFrame } from '../navigation/motion';
import { cloneRenderConfig } from '../navigation/waypoints';
import type {
  AnimationClip,
  AnimationKeyframe,
  NavigationActionId,
  NavigationSettings,
  RecordedNavigationEvent,
  RenderConfig,
} from '../types/config';
import { ANIMATION_SCHEMA_VERSION } from '../types/config';

const RECORDING_SAMPLE_MS = 250;

export function buildClipFromRecordedNavigation(
  baseConfig: RenderConfig,
  settings: NavigationSettings,
  events: RecordedNavigationEvent[],
): AnimationClip | null {
  if (events.length === 0) {
    return null;
  }

  const sorted = [...events].sort((left, right) => left.timestampMs - right.timestampMs);
  const durationMs = Math.max(sorted[sorted.length - 1].timestampMs, RECORDING_SAMPLE_MS);
  const checkpoints = buildCheckpoints(baseConfig, settings, sorted, durationMs);
  const keyframes = checkpoints.map((entry, index) => ({
    id: `recorded-${index}-${Math.round(entry.timeMs)}`,
    label: index === 0 ? 'Recorded start' : index === checkpoints.length - 1 ? 'Recorded end' : `Recorded ${index}`,
    time: entry.timeMs / durationMs,
    renderConfig: entry.config,
  })) satisfies AnimationKeyframe[];

  return {
    schemaVersion: ANIMATION_SCHEMA_VERSION,
    name: 'Recorded navigation journey',
    durationMs,
    fps: 24,
    easing: 'linear',
    keyframes,
  };
}

function buildCheckpoints(
  baseConfig: RenderConfig,
  settings: NavigationSettings,
  events: RecordedNavigationEvent[],
  durationMs: number,
): Array<{ timeMs: number; config: RenderConfig }> {
  const checkpoints = [0];

  for (let timeMs = RECORDING_SAMPLE_MS; timeMs < durationMs; timeMs += RECORDING_SAMPLE_MS) {
    checkpoints.push(timeMs);
  }

  if (checkpoints[checkpoints.length - 1] !== durationMs) {
    checkpoints.push(durationMs);
  }

  const result: Array<{ timeMs: number; config: RenderConfig }> = [];
  const activeActions = new Set<NavigationActionId>();
  let eventIndex = 0;
  let current = cloneRenderConfig(baseConfig);
  let previousTimeMs = 0;

  for (const timeMs of checkpoints) {
    while (eventIndex < events.length && events[eventIndex].timestampMs <= timeMs) {
      const event = events[eventIndex];
      current = {
        ...current,
        viewport: applyNavigationFrame(
          current.viewport,
          activeActions,
          settings,
          (event.timestampMs - previousTimeMs) / 1000,
        ),
      };
      previousTimeMs = event.timestampMs;

      if (event.phase === 'start') {
        activeActions.add(event.action);
      } else {
        activeActions.delete(event.action);
      }

      eventIndex += 1;
    }

    current = {
      ...current,
      viewport: applyNavigationFrame(
        current.viewport,
        activeActions,
        settings,
        (timeMs - previousTimeMs) / 1000,
      ),
    };
    previousTimeMs = timeMs;

    result.push({
      timeMs,
      config: cloneRenderConfig(current),
    });
  }

  return result;
}
