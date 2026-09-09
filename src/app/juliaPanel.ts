import type { FormulaId } from '../types/config';

export interface RenderViewPlaceholder {
  eyebrow: string;
  title: string;
  body: string;
}

export interface JuliaPanelPresentation {
  subtitle: string;
  renderingEnabled: boolean;
  interactionEnabled: boolean;
  placeholder: RenderViewPlaceholder | null;
}

export function getJuliaPanelPresentation(
  formulaId: FormulaId,
  hasSeed: boolean,
): JuliaPanelPresentation {
  if (hasSeed) {
    return {
      subtitle: 'Secondary panel seeded from the main surface',
      renderingEnabled: true,
      interactionEnabled: true,
      placeholder: null,
    };
  }

  if (formulaId === 'mandelbrot') {
    return {
      subtitle: 'Waiting for a Mandelbrot point',
      renderingEnabled: false,
      interactionEnabled: false,
      placeholder: {
        eyebrow: 'Linked Julia view',
        title: 'Choose a Mandelbrot seed',
        body: 'Click the main Mandelbrot surface to generate the corresponding Julia set here.',
      },
    };
  }

  return {
    subtitle: 'Linked Julia view is available from Mandelbrot explore mode',
    renderingEnabled: false,
    interactionEnabled: false,
    placeholder: {
      eyebrow: 'Linked Julia view',
      title: 'Switch back to Mandelbrot to link a seed',
      body: 'This side panel activates from Mandelbrot exploration so linked Julia worlds stay easy to discover.',
    },
  };
}
