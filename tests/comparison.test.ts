import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import {
  createDefaultComparisonConfig,
  setComparisonSynchronization,
  updateComparisonSide,
} from '../src/comparison/model';
import { complexFromNumbers } from '../src/math/complex';
import { fromNumber, toNumber } from '../src/math/doubleSingle';

describe('comparison model', () => {
  it('initializes a shared-viewport comparison config', () => {
    const base = createDefaultRenderConfig('mandelbrot');
    const comparison = createDefaultComparisonConfig(base);

    expect(comparison.mode).toBe('split');
    expect(comparison.synchroniseViewport).toBe(true);
    expect(toNumber(comparison.left.viewport.scale)).toBeCloseTo(toNumber(comparison.right.viewport.scale), 12);
  });

  it('shares viewport changes when synchronization is enabled', () => {
    const comparison = createDefaultComparisonConfig(createDefaultRenderConfig('mandelbrot'));
    const nextLeft = {
      ...comparison.left,
      viewport: {
        ...comparison.left.viewport,
        centre: complexFromNumbers(-0.5, 0.2),
        scale: fromNumber(0.15),
      },
    };

    const updated = updateComparisonSide(comparison, 'left', nextLeft);

    expect(toNumber(updated.right.viewport.centre.re)).toBeCloseTo(-0.5, 12);
    expect(toNumber(updated.right.viewport.scale)).toBeCloseTo(0.15, 12);
  });

  it('keeps viewports independent when synchronization is disabled', () => {
    const comparison = setComparisonSynchronization(
      createDefaultComparisonConfig(createDefaultRenderConfig('julia')),
      false,
    );
    const nextRight = {
      ...comparison.right,
      viewport: {
        ...comparison.right.viewport,
        centre: complexFromNumbers(0.31, -0.12),
      },
    };

    const updated = updateComparisonSide(comparison, 'right', nextRight);

    expect(toNumber(updated.left.viewport.centre.re)).not.toBeCloseTo(0.31, 6);
    expect(toNumber(updated.right.viewport.centre.re)).toBeCloseTo(0.31, 12);
  });
});
