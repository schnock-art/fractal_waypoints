import { describe, expect, it, beforeEach } from 'vitest';

import { createDefaultNavigationSettings } from '../src/navigation/settings';
import { createWaypoint, scoreRenderInterestingness } from '../src/navigation/waypoints';
import { loadNavigationSettings, loadWaypoints, saveNavigationSettings, saveWaypoints } from '../src/persistence/storage';
import { decodeRenderConfigFromUrlParam, encodeRenderConfigToUrlParam } from '../src/persistence/urlState';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';

describe('render config url state', () => {
  it('round-trips a render config through the URL encoder', () => {
    const config = createDefaultRenderConfig('julia');
    const encoded = encodeRenderConfigToUrlParam(config);
    const decoded = decodeRenderConfigFromUrlParam(encoded);

    expect(decoded).toEqual(config);
  });
});

describe('waypoint scoring', () => {
  it('gives deeper zooms and richer settings a positive score', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    config.viewport.scale.hi = 0.001;
    config.fractal.maxIterations = 320;

    expect(scoreRenderInterestingness(config)).toBeGreaterThan(1);
  });

  it('creates a serializable waypoint with score metadata', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    const waypoint = createWaypoint({
      name: 'Test Waypoint',
      renderConfig: config,
      source: 'user',
      thumbnailDataUrl: 'data:image/png;base64,example',
    });

    expect(waypoint.name).toBe('Test Waypoint');
    expect(waypoint.interestingnessScore).toBeGreaterThan(0);
    expect(waypoint.thumbnailDataUrl).toBe('data:image/png;base64,example');
  });
});

describe('local storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists navigation settings', () => {
    const settings = createDefaultNavigationSettings();
    settings.panSpeed = 1.4;

    saveNavigationSettings(settings);

    expect(loadNavigationSettings(createDefaultNavigationSettings()).panSpeed).toBe(1.4);
  });

  it('adds newly introduced default bindings to existing preferences when their keys are free', () => {
    const legacySettings = createDefaultNavigationSettings();
    legacySettings.bindings = legacySettings.bindings.filter((binding) => !binding.action.startsWith('julia'));

    saveNavigationSettings(legacySettings);

    const loaded = loadNavigationSettings(createDefaultNavigationSettings());
    expect(loaded.bindings).toContainEqual({ action: 'juliaRealDecrease', key: 'j' });
    expect(loaded.bindings).toContainEqual({ action: 'juliaImaginaryIncrease', key: 'i' });
  });

  it('persists user waypoints', () => {
    const waypoint = createWaypoint({
      name: 'Stored',
      renderConfig: createDefaultRenderConfig(),
      source: 'user',
    });

    saveWaypoints([waypoint]);

    expect(loadWaypoints()).toHaveLength(1);
    expect(loadWaypoints()[0].name).toBe('Stored');
  });
});
