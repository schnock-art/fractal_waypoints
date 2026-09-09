import type { NavigationActionId, NavigationSettings } from '../types/config';

export function normalizeKeyboardKey(key: string): string {
  if (key.length === 1) {
    return key.toLowerCase();
  }

  return key;
}

export function getActionsForKey(
  settings: NavigationSettings,
  key: string,
): NavigationActionId[] {
  const normalizedKey = normalizeKeyboardKey(key);
  return settings.bindings
    .filter((binding) => normalizeKeyboardKey(binding.key) === normalizedKey)
    .map((binding) => binding.action);
}

export function updateNavigationBinding(
  settings: NavigationSettings,
  action: NavigationActionId,
  key: string,
): NavigationSettings {
  const normalizedKey = normalizeKeyboardKey(key);
  const nextBindings = settings.bindings
    .filter((binding) => binding.action !== action && normalizeKeyboardKey(binding.key) !== normalizedKey);

  nextBindings.push({
    action,
    key: normalizedKey,
  });

  return {
    ...settings,
    bindings: nextBindings,
  };
}

export function getBoundKey(
  settings: NavigationSettings,
  action: NavigationActionId,
): string | null {
  return settings.bindings.find((binding) => binding.action === action)?.key ?? null;
}
