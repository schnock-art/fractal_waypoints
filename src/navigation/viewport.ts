import { complexAdd, complexSubtract } from '../math/complex';
import { add, fromNumber, multiplyByFloat, subtract } from '../math/doubleSingle';
import type { DoubleSingleComplex, ViewportConfig } from '../types/config';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ViewSize {
  width: number;
  height: number;
}

export function mapPixelToComplex(
  point: ScreenPoint,
  viewport: ViewportConfig,
  size: ViewSize,
): DoubleSingleComplex {
  if (size.width <= 0 || size.height <= 0) {
    return viewport.centre;
  }

  const offset = rotatePoint(
    {
      x: ((point.x / size.width) - 0.5) * viewport.aspectRatio,
      y: 0.5 - (point.y / size.height),
    },
    viewport.rotation,
  );

  return {
    re: add(viewport.centre.re, multiplyByFloat(viewport.scale, offset.x)),
    im: add(viewport.centre.im, multiplyByFloat(viewport.scale, offset.y)),
  };
}

export function panViewport(
  viewport: ViewportConfig,
  delta: ScreenPoint,
  size: ViewSize,
): ViewportConfig {
  if (size.width <= 0 || size.height <= 0) {
    return viewport;
  }

  const offset = rotatePoint(
    {
      x: (delta.x / size.width) * viewport.aspectRatio,
      y: -(delta.y / size.height),
    },
    viewport.rotation,
  );

  return {
    ...viewport,
    centre: {
      re: subtract(viewport.centre.re, multiplyByFloat(viewport.scale, offset.x)),
      im: subtract(viewport.centre.im, multiplyByFloat(viewport.scale, offset.y)),
    },
  };
}

export function zoomViewport(
  viewport: ViewportConfig,
  focusPoint: ScreenPoint,
  size: ViewSize,
  zoomFactor: number,
): ViewportConfig {
  const before = mapPixelToComplex(focusPoint, viewport, size);
  const nextScale = multiplyByFloat(viewport.scale, zoomFactor);
  const scaledViewport = {
    ...viewport,
    scale: nextScale,
  };
  const after = mapPixelToComplex(focusPoint, scaledViewport, size);

  return {
    ...scaledViewport,
    centre: complexAdd(viewport.centre, complexSubtract(before, after)),
  };
}

export function updateAspectRatio(viewport: ViewportConfig, aspectRatio: number): ViewportConfig {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return viewport;
  }

  if (Math.abs(viewport.aspectRatio - aspectRatio) < 1e-6) {
    return viewport;
  }

  return {
    ...viewport,
    aspectRatio,
  };
}

export function resetJuliaViewport(aspectRatio: number): ViewportConfig {
  return {
    centre: {
      re: fromNumber(0),
      im: fromNumber(0),
    },
    scale: fromNumber(3),
    rotation: 0,
    aspectRatio,
  };
}

export function deltaBetweenComplexPoints(
  left: DoubleSingleComplex,
  right: DoubleSingleComplex,
): DoubleSingleComplex {
  return complexSubtract(left, right);
}

function rotatePoint(point: ScreenPoint, rotation: number): ScreenPoint {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    x: (point.x * cosine) - (point.y * sine),
    y: (point.x * sine) + (point.y * cosine),
  };
}
