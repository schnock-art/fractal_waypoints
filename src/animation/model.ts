import { cloneRenderConfig } from '../navigation/waypoints';
import type {
  AnimationClip,
  AnimationKeyframe,
  RecordedNavigationEvent,
  RenderConfig,
  Waypoint,
} from '../types/config';
import { ANIMATION_SCHEMA_VERSION } from '../types/config';

export function createDefaultAnimationClip(baseConfig: RenderConfig): AnimationClip {
  return {
    schemaVersion: ANIMATION_SCHEMA_VERSION,
    name: 'Untitled Journey',
    durationMs: 4_000,
    fps: 24,
    easing: 'easeInOut',
    keyframes: [
      createAnimationKeyframe({
        label: 'Start',
        time: 0,
        renderConfig: baseConfig,
      }),
      createAnimationKeyframe({
        label: 'End',
        time: 1,
        renderConfig: baseConfig,
      }),
    ],
  };
}

export function createAnimationKeyframe(params: {
  label: string;
  time: number;
  renderConfig: RenderConfig;
}): AnimationKeyframe {
  return {
    id: createAnimationId('keyframe'),
    label: params.label.trim() || 'Keyframe',
    time: clampUnit(params.time),
    renderConfig: cloneRenderConfig(params.renderConfig),
  };
}

export function sortAnimationKeyframes(keyframes: AnimationKeyframe[]): AnimationKeyframe[] {
  return [...keyframes].sort((left, right) => left.time - right.time);
}

export function upsertAnimationKeyframe(
  clip: AnimationClip,
  keyframe: AnimationKeyframe,
): AnimationClip {
  const remaining = clip.keyframes.filter((entry) => entry.id !== keyframe.id);
  return {
    ...clip,
    keyframes: sortAnimationKeyframes([...remaining, keyframe]),
  };
}

export function removeAnimationKeyframe(clip: AnimationClip, keyframeId: string): AnimationClip {
  const remaining = clip.keyframes.filter((entry) => entry.id !== keyframeId);
  return {
    ...clip,
    keyframes: remaining.length > 0 ? sortAnimationKeyframes(remaining) : clip.keyframes,
  };
}

export function createJourneyFromWaypoints(
  start: Waypoint,
  end: Waypoint,
): AnimationClip {
  return {
    schemaVersion: ANIMATION_SCHEMA_VERSION,
    name: `${start.name} to ${end.name}`,
    durationMs: 5_000,
    fps: 24,
    easing: 'easeInOut',
    keyframes: [
      createAnimationKeyframe({
        label: start.name,
        time: 0,
        renderConfig: start.renderConfig,
      }),
      createAnimationKeyframe({
        label: end.name,
        time: 1,
        renderConfig: end.renderConfig,
      }),
    ],
  };
}

export function hasRecordedNavigation(events: RecordedNavigationEvent[]): boolean {
  return events.length > 1;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function createAnimationId(prefix: string): string {
  if ('crypto' in globalThis && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
