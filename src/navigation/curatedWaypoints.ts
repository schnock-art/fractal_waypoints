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
    ...(['newton', 'nova'] as const).flatMap((formula) => [3, 4].map((degree) => {
      const config = createDefaultRenderConfig(formula);
      config.fractal.parameters.degree = degree;
      config.palette = clonePalette(degree === 3 ? electric : glacier);
      if (formula === 'nova') {
        config.viewport.centre = complexFromNumbers(-0.35, 0);
        config.viewport.scale = fromNumber(2.2);
      }
      return createWaypoint({
        name: formula === 'newton' ? (degree === 3 ? 'Newton Triskelion' : 'Newton Four Winds') : (degree === 3 ? 'Nova Silk Delta' : 'Nova Clover'),
        description: `${degree}-root ${formula === 'newton' ? 'basins: follow the interwoven boundaries or compare another root count' : 'parameter plane: convergence bands reveal flowing detail'}. Try the polynomial controls or save as a Journey keyframe.`,
        renderConfig: config, source: 'curated', tags: [formula, 'convergence', `roots-${degree}`],
      });
    })),
    ...[3, 4, 6].map((power) => {
      const config = createDefaultRenderConfig('multibrot');
      config.fractal.parameters.power = power;
      config.palette = clonePalette(power === 4 ? ember : glacier);
      return createWaypoint({
        name: power === 3 ? 'Cubic Butterfly' : power === 4 ? 'Quartic Crown' : 'Sixth-power Star',
        description: `The full power-${power} Multibrot landscape. Compare with another power or use it as a Journey keyframe.`,
        renderConfig: config, source: 'curated', tags: ['multibrot', `power-${power}`, 'symmetric'],
      });
    }),
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
