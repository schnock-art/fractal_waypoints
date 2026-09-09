import type { RenderConfig } from '../types/config';
import { createDefaultRenderConfig } from './defaultConfig';

export const firstFlightSteps = [
  { id: 'navigate', title: 'Find your bearings', body: 'Drag the Explore surface or scroll to move through Mandelbrot space.' },
  { id: 'linkJulia', title: 'Open a Julia world', body: 'Release any pan, then single-click a point on the Mandelbrot surface to seed the linked Julia view.' },
  { id: 'tuneJulia', title: 'Tune the seed', body: 'Adjust either linked Julia parameter to reshape the new world.' },
  { id: 'openSettings', title: 'Open flight controls', body: 'Select Settings in the workspace bar to see how navigation and keyboard controls can be tuned.' },
  { id: 'reviewControls', title: 'Review your controls', body: 'Take a look at view quality, movement tuning, and key bindings, then continue the flight.' },
  { id: 'saveWaypoint', title: 'Keep the discovery', body: 'Use Quick save in Waypoints to keep this view as a portal you can revisit.' },
] as const;

export type FirstFlightStepId = typeof firstFlightSteps[number]['id'];
export type FirstFlightState = FirstFlightStepId | 'complete' | 'dismissed';

export function advanceFirstFlight(state: FirstFlightState, action: FirstFlightStepId): FirstFlightState {
  const index = firstFlightSteps.findIndex((step) => step.id === state);
  if (index < 0 || firstFlightSteps[index].id !== action) {
    return state;
  }

  return firstFlightSteps[index + 1]?.id ?? 'complete';
}

export function createFirstFlightRenderConfig(current: RenderConfig): RenderConfig {
  const mandelbrot = createDefaultRenderConfig('mandelbrot');

  return {
    ...mandelbrot,
    colouring: current.colouring,
    palette: current.palette,
    quality: current.quality,
  };
}
