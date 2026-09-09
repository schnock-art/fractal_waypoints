import { formulaRegistry } from '../fractals/registry';
import type { FormulaId, RenderConfig, Waypoint, WaypointSource } from '../types/config';

export type WaypointSourceFilter = 'all' | WaypointSource;

export interface WaypointWorkspaceSection {
  source: WaypointSource;
  label: string;
  count: number;
  waypoints: Waypoint[];
}

const sourceOrder: WaypointSource[] = ['user', 'discovered', 'curated'];

export function groupWaypointsForWorkspace(
  waypoints: Waypoint[],
  filter: WaypointSourceFilter,
  searchTerm: string,
): WaypointWorkspaceSection[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return sourceOrder.map((source) => {
    const matchesFilter = filter === 'all' || filter === source;
    const groupedWaypoints = matchesFilter
      ? [...waypoints]
        .filter((waypoint) => waypoint.source === source)
        .filter((waypoint) => matchesWaypointSearch(waypoint, normalizedSearch))
        .sort((left, right) => compareWaypoints(left, right, source))
      : [];

    return {
      source,
      label: getWaypointSourceLabel(source),
      count: groupedWaypoints.length,
      waypoints: groupedWaypoints,
    };
  });
}

export function buildQuickWaypointName(config: RenderConfig, totalWaypoints: number): string {
  const formulaLabel = getFormulaLabel(config.fractal.formulaId);
  return `${formulaLabel} waypoint ${totalWaypoints + 1}`;
}

export function getWaypointSourceLabel(source: WaypointSource): string {
  switch (source) {
    case 'user':
      return 'Saved';
    case 'discovered':
      return 'Discovered';
    case 'curated':
      return 'Curated';
    default:
      return source;
  }
}

function matchesWaypointSearch(waypoint: Waypoint, searchTerm: string): boolean {
  if (!searchTerm) {
    return true;
  }

  const haystack = [
    waypoint.name,
    waypoint.description ?? '',
    waypoint.renderConfig.fractal.formulaId,
    ...waypoint.tags,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchTerm);
}

function compareWaypoints(left: Waypoint, right: Waypoint, source: WaypointSource): number {
  if (source === 'user') {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return (right.interestingnessScore ?? 0) - (left.interestingnessScore ?? 0);
}

function getFormulaLabel(formulaId: FormulaId): string {
  return formulaRegistry[formulaId]?.displayName ?? formulaId;
}
