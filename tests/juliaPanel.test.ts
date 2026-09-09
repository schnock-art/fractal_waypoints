import { describe, expect, it } from 'vitest';

import { getJuliaPanelPresentation } from '../src/app/juliaPanel';

describe('Julia panel presentation', () => {
  it('starts in a waiting state for Mandelbrot before a seed is selected', () => {
    const presentation = getJuliaPanelPresentation('mandelbrot', false);

    expect(presentation.renderingEnabled).toBe(false);
    expect(presentation.interactionEnabled).toBe(false);
    expect(presentation.subtitle).toBe('Waiting for a Mandelbrot point');
    expect(presentation.placeholder?.title).toBe('Choose a Mandelbrot seed');
  });

  it('activates once a linked Julia seed exists', () => {
    const presentation = getJuliaPanelPresentation('mandelbrot', true);

    expect(presentation.renderingEnabled).toBe(true);
    expect(presentation.interactionEnabled).toBe(true);
    expect(presentation.placeholder).toBeNull();
  });

  it('explains why linking is unavailable outside Mandelbrot mode', () => {
    const presentation = getJuliaPanelPresentation('burningShip', false);

    expect(presentation.renderingEnabled).toBe(false);
    expect(presentation.subtitle).toContain('Mandelbrot');
    expect(presentation.placeholder?.title).toContain('Switch back');
  });
});
