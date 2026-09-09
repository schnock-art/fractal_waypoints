import { complexFromNumbers } from '../math/complex';
import { fromNumber } from '../math/doubleSingle';
import { clonePalette } from '../palettes/model';
import { palettePresets } from '../palettes/presets';
import { createDefaultRenderConfig } from '../app/defaultConfig';
import { createWaypoint } from './waypoints';
import type { Waypoint } from '../types/config';

export function getCuratedWaypoints(): Waypoint[] {
  const electric = clonePalette(palettePresets[0].palette);
  const ember = clonePalette(palettePresets[1].palette);
  const glacier = clonePalette(palettePresets[2].palette);

  const seahorse = createDefaultRenderConfig('mandelbrot');
  seahorse.viewport.centre = complexFromNumbers(-0.74543, 0.11301);
  seahorse.viewport.scale = fromNumber(0.0048);
  seahorse.fractal.maxIterations = 280;
  seahorse.palette = electric;

  const valley = createDefaultRenderConfig('mandelbrot');
  valley.viewport.centre = complexFromNumbers(-0.1011, 0.9563);
  valley.viewport.scale = fromNumber(0.09);
  valley.fractal.maxIterations = 240;
  valley.palette = glacier;

  const juliaBloom = createDefaultRenderConfig('julia');
  juliaBloom.fractal.parameters = { cReal: -0.72, cImag: 0.1889 };
  juliaBloom.viewport.centre = complexFromNumbers(0.02, -0.01);
  juliaBloom.viewport.scale = fromNumber(2.4);
  juliaBloom.fractal.maxIterations = 220;
  juliaBloom.palette = ember;

  return [
    createWaypoint({
      name: 'Seahorse Ridge',
      description: 'A classic Mandelbrot coastline with branching detail.',
      renderConfig: seahorse,
      source: 'curated',
      tags: ['mandelbrot', 'branching', 'coast'],
    }),
    createWaypoint({
      name: 'Valley Arc',
      description: 'A broader Mandelbrot inlet with strong repeating curvature.',
      renderConfig: valley,
      source: 'curated',
      tags: ['mandelbrot', 'arc', 'terrain'],
    }),
    createWaypoint({
      name: 'Julia Bloom',
      description: 'A balanced Julia form with good internal recursion.',
      renderConfig: juliaBloom,
      source: 'curated',
      tags: ['julia', 'symmetric', 'bloom'],
    }),
  ];
}
