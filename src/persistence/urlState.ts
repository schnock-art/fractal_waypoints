import type { RenderConfig } from '../types/config';
import { migrateRenderConfig } from './renderConfig';

const PARAM_KEY = 'view';

export function encodeRenderConfigToUrlParam(config: RenderConfig): string {
  const json = JSON.stringify(config);
  return toBase64Url(json);
}

export function decodeRenderConfigFromUrlParam(encoded: string): RenderConfig | null {
  try {
    const json = fromBase64Url(encoded);
    return migrateRenderConfig(JSON.parse(json));
  } catch {
    return null;
  }
}

export function readRenderConfigFromLocation(location: Location = window.location): RenderConfig | null {
  const params = new URLSearchParams(location.search);
  const encoded = params.get(PARAM_KEY);
  return encoded ? decodeRenderConfigFromUrlParam(encoded) : null;
}

export function writeRenderConfigToHistory(
  config: RenderConfig,
  mode: 'replace' | 'push',
  historyRef: History = window.history,
  locationRef: Location = window.location,
): void {
  const url = new URL(locationRef.href);
  url.searchParams.set(PARAM_KEY, encodeRenderConfigToUrlParam(config));

  if (mode === 'replace') {
    historyRef.replaceState(null, '', url);
  } else {
    historyRef.pushState(null, '', url);
  }
}

function toBase64Url(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  return decodeURIComponent(escape(atob(normalized)));
}
