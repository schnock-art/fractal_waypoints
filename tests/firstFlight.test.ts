import { describe, expect, it } from 'vitest';
import { advanceFirstFlight, createFirstFlightRenderConfig } from '../src/app/firstFlight';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';

describe('First flight progression', () => {
  it('only advances when the active guided action is completed', () => {
    expect(advanceFirstFlight('navigate', 'linkJulia')).toBe('navigate');
    expect(advanceFirstFlight('navigate', 'navigate')).toBe('linkJulia');
    expect(advanceFirstFlight('linkJulia', 'linkJulia')).toBe('tuneJulia');
    expect(advanceFirstFlight('tuneJulia', 'tuneJulia')).toBe('openSettings');
    expect(advanceFirstFlight('openSettings', 'openSettings')).toBe('reviewControls');
    expect(advanceFirstFlight('reviewControls', 'reviewControls')).toBe('saveWaypoint');
    expect(advanceFirstFlight('saveWaypoint', 'saveWaypoint')).toBe('complete');
  });

  it('starts from Mandelbrot while preserving the current visual settings', () => {
    const current = createDefaultRenderConfig('tricorn');
    current.quality.pixelDensity = 1.5;
    current.colouring.parameters.density = 0.06;

    const tutorialConfig = createFirstFlightRenderConfig(current);

    expect(tutorialConfig.fractal.formulaId).toBe('mandelbrot');
    expect(tutorialConfig.viewport.centre.re.hi).toBe(-0.75);
    expect(tutorialConfig.quality.pixelDensity).toBe(1.5);
    expect(tutorialConfig.colouring.parameters.density).toBe(0.06);
  });
});
