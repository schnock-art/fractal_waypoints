import { add, multiplyByFloat } from '../math/doubleSingle';
import type { NavigationActionId, NavigationSettings, ViewportConfig } from '../types/config';

export function applyNavigationFrame(
  viewport: ViewportConfig,
  actions: Iterable<NavigationActionId>,
  settings: NavigationSettings,
  deltaSeconds: number,
): ViewportConfig {
  const actionSet = new Set(actions);
  const clampedDelta = Math.max(0, Math.min(deltaSeconds, 0.1));

  if (actionSet.size === 0 || clampedDelta === 0) {
    return viewport;
  }

  const boostMultiplier = actionSet.has('boostModifier') ? settings.boostMultiplier : 1;
  const precisionMultiplier = actionSet.has('precisionModifier') ? settings.precisionMultiplier : 1;
  const speedMultiplier = boostMultiplier * precisionMultiplier;

  let nextViewport = viewport;

  const horizontal = getAxisValue(actionSet, 'moveRight', 'moveLeft');
  const vertical = getAxisValue(actionSet, 'moveUp', 'moveDown');
  if (horizontal !== 0 || vertical !== 0) {
    const panScale = settings.panSpeed * clampedDelta * speedMultiplier;
    const rotated = rotateVector(
      horizontal * viewport.aspectRatio,
      vertical,
      viewport.rotation,
    );

    nextViewport = {
      ...nextViewport,
      centre: {
        re: add(nextViewport.centre.re, multiplyByFloat(nextViewport.scale, rotated.x * panScale)),
        im: add(nextViewport.centre.im, multiplyByFloat(nextViewport.scale, rotated.y * panScale)),
      },
    };
  }

  const zoomDirection = getAxisValue(actionSet, 'zoomOut', 'zoomIn');
  if (zoomDirection !== 0) {
    const zoomFactor = Math.exp(settings.zoomSpeed * clampedDelta * speedMultiplier * zoomDirection);
    nextViewport = {
      ...nextViewport,
      scale: multiplyByFloat(nextViewport.scale, zoomFactor),
    };
  }

  const rotationDirection = getAxisValue(actionSet, 'rotateRight', 'rotateLeft');
  if (rotationDirection !== 0) {
    nextViewport = {
      ...nextViewport,
      rotation: nextViewport.rotation + (settings.rotationSpeed * clampedDelta * speedMultiplier * rotationDirection),
    };
  }

  return nextViewport;
}

function getAxisValue(
  actions: Set<NavigationActionId>,
  positive: NavigationActionId,
  negative: NavigationActionId,
): number {
  return Number(actions.has(positive)) - Number(actions.has(negative));
}

function rotateVector(x: number, y: number, rotation: number): { x: number; y: number } {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    x: (x * cosine) - (y * sine),
    y: (x * sine) + (y * cosine),
  };
}
