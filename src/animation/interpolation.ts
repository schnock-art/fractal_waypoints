import { complexFromNumbers } from '../math/complex';
import { fromNumber, toNumber } from '../math/doubleSingle';
import { clonePalette } from '../palettes/model';
import type { AnimationClip, AnimationEasing, AnimationKeyframe, RenderConfig } from '../types/config';
import { cloneRenderConfig } from '../navigation/waypoints';

export function sampleAnimationClip(clip: AnimationClip, timeMs: number): RenderConfig {
  const keyframes = [...clip.keyframes].sort((left, right) => left.time - right.time);
  if (keyframes.length === 0) {
    throw new Error('Animation clip needs at least one keyframe.');
  }

  if (keyframes.length === 1 || clip.durationMs <= 0) {
    return cloneRenderConfig(keyframes[0].renderConfig);
  }

  const normalizedTime = Math.min(1, Math.max(0, timeMs / clip.durationMs));
  const rightIndex = keyframes.findIndex((keyframe) => keyframe.time >= normalizedTime);
  if (rightIndex <= 0) {
    return cloneRenderConfig(keyframes[0].renderConfig);
  }

  if (rightIndex === -1) {
    return cloneRenderConfig(keyframes[keyframes.length - 1].renderConfig);
  }

  const left = keyframes[rightIndex - 1];
  const right = keyframes[rightIndex];
  const span = Math.max(right.time - left.time, Number.EPSILON);
  const localT = (normalizedTime - left.time) / span;

  return interpolateRenderConfigs(left.renderConfig, right.renderConfig, applyEasing(clip.easing, localT));
}

export function generateAnimationFrames(clip: AnimationClip): RenderConfig[] {
  const fps = Math.max(1, Math.round(clip.fps));
  const frameCount = Math.max(2, Math.round((clip.durationMs / 1000) * fps) + 1);
  const frames: RenderConfig[] = [];

  for (let index = 0; index < frameCount; index += 1) {
    const timeMs = index === frameCount - 1
      ? clip.durationMs
      : (index / (frameCount - 1)) * clip.durationMs;
    frames.push(sampleAnimationClip(clip, timeMs));
  }

  return frames;
}

export function interpolateRenderConfigs(
  left: RenderConfig,
  right: RenderConfig,
  t: number,
): RenderConfig {
  const clamped = Math.min(1, Math.max(0, t));
  const base = clamped < 0.5 ? left : right;

  return {
    ...cloneRenderConfig(base),
    viewport: {
      centre: complexFromNumbers(
        interpolateNumber(toNumber(left.viewport.centre.re), toNumber(right.viewport.centre.re), clamped),
        interpolateNumber(toNumber(left.viewport.centre.im), toNumber(right.viewport.centre.im), clamped),
      ),
      scale: fromNumber(interpolateLogarithmic(
        Math.max(toNumber(left.viewport.scale), 1e-12),
        Math.max(toNumber(right.viewport.scale), 1e-12),
        clamped,
      )),
      rotation: interpolateAngle(left.viewport.rotation, right.viewport.rotation, clamped),
      aspectRatio: interpolateNumber(left.viewport.aspectRatio, right.viewport.aspectRatio, clamped),
    },
    fractal: {
      ...base.fractal,
      maxIterations: Math.round(interpolateNumber(left.fractal.maxIterations, right.fractal.maxIterations, clamped)),
      bailout: interpolateNumber(left.fractal.bailout, right.fractal.bailout, clamped),
      parameters: interpolateParameterMap(left.fractal.parameters, right.fractal.parameters, clamped),
    },
    colouring: {
      ...base.colouring,
      parameters: interpolateParameterMap(left.colouring.parameters, right.colouring.parameters, clamped),
    },
    palette: interpolatePalette(left.palette, right.palette, clamped),
    quality: {
      pixelDensity: interpolateNumber(left.quality.pixelDensity, right.quality.pixelDensity, clamped),
    },
  };
}

export function applyEasing(easing: AnimationEasing, t: number): number {
  if (easing === 'linear') {
    return t;
  }

  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolatePalette(left: RenderConfig['palette'], right: RenderConfig['palette'], t: number): RenderConfig['palette'] {
  const base = t < 0.5 ? left : right;
  const count = Math.min(left.stops.length, right.stops.length);

  if (count === 0) {
    return clonePalette(base);
  }

  return {
    ...clonePalette(base),
    offset: interpolateNumber(left.offset, right.offset, t),
    scale: interpolateNumber(left.scale, right.scale, t),
    stops: Array.from({ length: count }, (_, index) => ({
      position: interpolateNumber(left.stops[index].position, right.stops[index].position, t),
      color: {
        r: interpolateNumber(left.stops[index].color.r, right.stops[index].color.r, t),
        g: interpolateNumber(left.stops[index].color.g, right.stops[index].color.g, t),
        b: interpolateNumber(left.stops[index].color.b, right.stops[index].color.b, t),
        a: interpolateNumber(left.stops[index].color.a, right.stops[index].color.a, t),
      },
    })),
  };
}

function interpolateParameterMap(
  left: Record<string, number>,
  right: Record<string, number>,
  t: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    const start = left[key] ?? right[key] ?? 0;
    const end = right[key] ?? left[key] ?? 0;
    result[key] = interpolateNumber(start, end, t);
  }

  return result;
}

function interpolateAngle(left: number, right: number, t: number): number {
  const delta = ((((right - left) % (Math.PI * 2)) + (Math.PI * 3)) % (Math.PI * 2)) - Math.PI;
  return left + (delta * t);
}

function interpolateLogarithmic(left: number, right: number, t: number): number {
  return Math.exp(interpolateNumber(Math.log(left), Math.log(right), t));
}

function interpolateNumber(left: number, right: number, t: number): number {
  return left + ((right - left) * t);
}
