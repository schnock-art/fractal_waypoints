import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { buildQuickWaypointName, getWaypointSourceLabel, groupWaypointsForWorkspace } from '../src/navigation/waypointWorkspace';
import { createWaypoint } from '../src/navigation/waypoints';

describe('waypoint workspace helpers', () => {
  it('groups waypoints by source in the intended workspace order', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    const waypoints = [
      createWaypoint({ name: 'Curated alpha', renderConfig: config, source: 'curated' }),
      createWaypoint({ name: 'User alpha', renderConfig: config, source: 'user' }),
      createWaypoint({ name: 'Discovery alpha', renderConfig: config, source: 'discovered' }),
    ];

    const grouped = groupWaypointsForWorkspace(waypoints, 'all', '');

    expect(grouped.map((section) => section.source)).toEqual(['user', 'discovered', 'curated']);
    expect(grouped.map((section) => section.count)).toEqual([1, 1, 1]);
  });

  it('filters waypoints by source and search term', () => {
    const julia = createDefaultRenderConfig('julia');
    const mandelbrot = createDefaultRenderConfig('mandelbrot');
    const waypoints = [
      createWaypoint({ name: 'Spiral Gate', description: 'Orange bloom', renderConfig: julia, source: 'user', tags: ['warm'] }),
      createWaypoint({ name: 'Needle Coast', renderConfig: mandelbrot, source: 'discovered', tags: ['sharp'] }),
    ];

    const grouped = groupWaypointsForWorkspace(waypoints, 'user', 'spiral');

    expect(grouped[0].waypoints).toHaveLength(1);
    expect(grouped[0].waypoints[0].name).toBe('Spiral Gate');
    expect(grouped[1].waypoints).toHaveLength(0);
    expect(grouped[2].waypoints).toHaveLength(0);
  });

  it('builds readable labels for workspace copy', () => {
    expect(buildQuickWaypointName(createDefaultRenderConfig('julia'), 4)).toBe('Julia waypoint 5');
    expect(getWaypointSourceLabel('discovered')).toBe('Discovered');
  });
});
