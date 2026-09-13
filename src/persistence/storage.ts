import type { NavigationSettings, Waypoint } from '../types/config';
import { migrateWaypoint } from './renderConfig';

const WAYPOINTS_STORAGE_KEY = 'fractal-explorer:waypoints:v1';
const NAVIGATION_STORAGE_KEY = 'fractal-explorer:navigation:v1';

export function loadWaypoints(): Waypoint[] {
  const stored = loadJson<unknown[]>(WAYPOINTS_STORAGE_KEY, []);
  return stored.map(migrateWaypoint).filter((waypoint): waypoint is Waypoint => waypoint !== null);
}

export function saveWaypoints(waypoints: Waypoint[]): void {
  saveJson(WAYPOINTS_STORAGE_KEY, waypoints);
}

export function loadNavigationSettings<T extends NavigationSettings>(fallback: T): T {
  const stored = loadJson<T | null>(NAVIGATION_STORAGE_KEY, null);
  if (!stored) {
    return fallback;
  }

  const storedBindings = Array.isArray(stored.bindings) ? stored.bindings : [];
  const usedKeys = new Set(storedBindings.map((binding) => binding.key.toLowerCase()));
  const missingBindings = fallback.bindings.filter(
    (binding) => !storedBindings.some((storedBinding) => storedBinding.action === binding.action) && !usedKeys.has(binding.key.toLowerCase()),
  );

  return {
    ...fallback,
    ...stored,
    bindings: [...storedBindings, ...missingBindings],
  };
}

export function saveNavigationSettings(settings: NavigationSettings): void {
  saveJson(NAVIGATION_STORAGE_KEY, settings);
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is optional. Ignore quota and privacy-mode failures.
  }
}
