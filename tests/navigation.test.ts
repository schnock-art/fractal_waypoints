import { describe, expect, it } from 'vitest';

import { complexFromNumbers } from '../src/math/complex';
import { fromNumber, subtract, toNumber } from '../src/math/doubleSingle';
import { getActionsForKey, updateNavigationBinding } from '../src/navigation/keyboard';
import { applyNavigationFrame } from '../src/navigation/motion';
import { createDefaultNavigationSettings } from '../src/navigation/settings';
import type { ViewportConfig } from '../src/types/config';

function createViewport(overrides: Partial<ViewportConfig> = {}): ViewportConfig {
  return {
    centre: complexFromNumbers(-0.75, 0),
    scale: fromNumber(2.8),
    rotation: 0,
    aspectRatio: 2,
    ...overrides,
  };
}

describe('navigation bindings', () => {
  it('maps default WASD controls to movement actions', () => {
    const settings = createDefaultNavigationSettings();

    expect(getActionsForKey(settings, 'w')).toEqual(['moveUp']);
    expect(getActionsForKey(settings, 'a')).toEqual(['moveLeft']);
    expect(getActionsForKey(settings, 'Shift')).toEqual(['precisionModifier']);
    expect(getActionsForKey(settings, 'j')).toEqual(['juliaRealDecrease']);
    expect(getActionsForKey(settings, 'i')).toEqual(['juliaImaginaryIncrease']);
  });

  it('rebinds actions and removes conflicting assignments', () => {
    const settings = createDefaultNavigationSettings();
    const rebound = updateNavigationBinding(settings, 'moveUp', 'ArrowUp');

    expect(getActionsForKey(rebound, 'w')).toEqual([]);
    expect(getActionsForKey(rebound, 'ArrowUp')).toEqual(['moveUp']);
  });
});

describe('continuous viewport navigation', () => {
  it('moves the viewport upward with semantic movement actions', () => {
    const settings = createDefaultNavigationSettings();
    const viewport = createViewport();
    const moved = applyNavigationFrame(viewport, ['moveUp'], settings, 1);

    expect(toNumber(subtract(moved.centre.im, viewport.centre.im))).toBeCloseTo(0.238, 12);
  });

  it('applies boost and precision modifiers multiplicatively', () => {
    const settings = createDefaultNavigationSettings();
    const viewport = createViewport();
    const moved = applyNavigationFrame(
      viewport,
      ['moveRight', 'boostModifier', 'precisionModifier'],
      settings,
      1,
    );

    expect(toNumber(subtract(moved.centre.re, viewport.centre.re))).toBeCloseTo(0.4284, 12);
  });

  it('applies a precision modifier when combined with a navigation action', () => {
    const settings = createDefaultNavigationSettings();
    const viewport = createViewport();
    const moved = applyNavigationFrame(viewport, ['moveRight', 'precisionModifier'], settings, 1);

    expect(toNumber(subtract(moved.centre.re, viewport.centre.re))).toBeCloseTo(0.1428, 12);
  });

  it('zooms and rotates continuously through semantic actions', () => {
    const settings = createDefaultNavigationSettings();
    const viewport = createViewport();
    const moved = applyNavigationFrame(
      viewport,
      ['zoomIn', 'rotateRight'],
      settings,
      0.5,
    );

    expect(toNumber(moved.scale)).toBeCloseTo(2.8 * Math.exp(-0.16), 10);
    expect(moved.rotation).toBeCloseTo(0.125, 12);
  });
});
