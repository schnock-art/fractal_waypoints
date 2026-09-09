import { describe, expect, it } from 'vitest';

import { complexFromNumbers } from '../src/math/complex';
import { fromNumber, subtract, toNumber } from '../src/math/doubleSingle';
import { mapPixelToComplex, panViewport, zoomViewport } from '../src/navigation/viewport';
import type { ViewportConfig } from '../src/types/config';

const size = { width: 400, height: 200 };

function createViewport(overrides: Partial<ViewportConfig> = {}): ViewportConfig {
  return {
    centre: complexFromNumbers(-0.75, 0),
    scale: fromNumber(2.8),
    rotation: 0,
    aspectRatio: size.width / size.height,
    ...overrides,
  };
}

describe('viewport mapping', () => {
  it('maps the centre pixel to the viewport centre', () => {
    const viewport = createViewport();
    const mapped = mapPixelToComplex({ x: 200, y: 100 }, viewport, size);

    expect(toNumber(subtract(mapped.re, viewport.centre.re))).toBeCloseTo(0, 12);
    expect(toNumber(subtract(mapped.im, viewport.centre.im))).toBeCloseTo(0, 12);
  });

  it('applies aspect ratio to horizontal offsets', () => {
    const viewport = createViewport();
    const mapped = mapPixelToComplex({ x: 400, y: 100 }, viewport, size);
    const delta = subtract(mapped.re, viewport.centre.re);

    expect(toNumber(delta)).toBeCloseTo(2.8, 12);
  });

  it('keeps the focus point fixed while zooming', () => {
    const viewport = createViewport();
    const focus = { x: 280, y: 120 };
    const before = mapPixelToComplex(focus, viewport, size);
    const zoomed = zoomViewport(viewport, focus, size, 0.5);
    const after = mapPixelToComplex(focus, zoomed, size);

    expect(toNumber(subtract(after.re, before.re))).toBeCloseTo(0, 12);
    expect(toNumber(subtract(after.im, before.im))).toBeCloseTo(0, 12);
  });

  it('pans by moving the centre opposite the drag direction', () => {
    const viewport = createViewport();
    const panned = panViewport(viewport, { x: 40, y: 0 }, size);
    const delta = subtract(panned.centre.re, viewport.centre.re);

    expect(toNumber(delta)).toBeCloseTo(-0.56, 12);
  });

  it('preserves tiny offsets around huge centres through the double-single path', () => {
    const viewport = createViewport({
      centre: complexFromNumbers(1e16, -1e16),
      scale: fromNumber(1e-6),
      aspectRatio: 1,
    });
    const mapped = mapPixelToComplex({ x: 501, y: 500 }, viewport, { width: 1000, height: 1000 });
    const delta = subtract(mapped.re, viewport.centre.re);

    expect(toNumber(delta)).toBeCloseTo(1e-9, 18);
  });
});
