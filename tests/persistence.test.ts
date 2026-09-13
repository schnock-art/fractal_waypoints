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

  it('migrates legacy colouring links to their equivalent material and neutral lens', () => {
    const legacy = createDefaultRenderConfig('mandelbrot') as unknown as Record<string, unknown>;
    legacy.schemaVersion = 1;
    legacy.colouring = { algorithmId: 'orbitTrap', parameters: { density: 0.04, trapScale: 1.6 } };
    delete legacy.material;
    delete legacy.lens;

    const decoded = decodeRenderConfigFromUrlParam(encodeLegacy(legacy));

    expect(decoded?.schemaVersion).toBe(3);
    expect(decoded?.material.id).toBe('orbitTrap');
    expect(decoded?.material.parameters).toEqual({ density: 0.04, trapScale: 1.6 });
    expect(decoded?.material.orbitTraps?.traps.map((trap) => trap.shape)).toEqual(['circle', 'cross']);
    expect(decoded?.lens).toEqual({ exposure: 1, vignette: 0 });
  });

  it('backfills the composed trap set for version-2 Orbit Trap links', () => {
    const versionTwo = createDefaultRenderConfig('mandelbrot') as unknown as Record<string, unknown>;
    versionTwo.schemaVersion = 2;
    versionTwo.material = { id: 'orbitTrap', parameters: { density: 0.032, trapScale: 1 } };

    const decoded = decodeRenderConfigFromUrlParam(encodeLegacy(versionTwo));

    expect(decoded?.schemaVersion).toBe(3);
    expect(decoded?.material.orbitTraps?.composition).toBe('minimum');
    expect(decoded?.material.orbitTraps?.traps.map((trap) => trap.shape)).toEqual(['circle', 'cross']);
  });

  it('round-trips optional orbit-trap appearance controls with a styled view', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    config.material.id = 'orbitTrap';
    config.material.orbitAppearance = {
      metric: 'final',
      paletteMapping: 'distanceBands',
      exteriorMix: 0.75,
      interiorMix: 0.45,
      emission: 0.3,
    };

    expect(decodeRenderConfigFromUrlParam(encodeRenderConfigToUrlParam(config))?.material.orbitAppearance)
      .toEqual(config.material.orbitAppearance);
  });
});

function encodeLegacy(value: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

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

  it('migrates stored legacy Waypoints before exposing them to the workspace', () => {
    const waypoint = createWaypoint({
      name: 'Legacy trap',
      renderConfig: createDefaultRenderConfig(),
      source: 'user',
    }) as unknown as { renderConfig: Record<string, unknown> } & Record<string, unknown>;
    waypoint.renderConfig.schemaVersion = 1;
    waypoint.renderConfig.colouring = { algorithmId: 'orbitTrap', parameters: { density: 0.05 } };
    delete waypoint.renderConfig.material;
    delete waypoint.renderConfig.lens;
    window.localStorage.setItem('fractal-explorer:waypoints:v1', JSON.stringify([waypoint]));

    const [migrated] = loadWaypoints();

    expect(migrated.renderConfig.schemaVersion).toBe(3);
    expect(migrated.renderConfig.material.id).toBe('orbitTrap');
  });
});
