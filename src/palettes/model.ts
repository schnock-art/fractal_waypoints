import type { PaletteConfig, PaletteRepeatMode, PaletteStop, RgbaColor } from '../types/config';
import { readPaletteOffset } from './offset';

export interface PaletteValidationIssue {
  message: string;
}

const MIN_STOPS = 2;

export function clonePalette(config: PaletteConfig): PaletteConfig {
  return {
    ...config,
    stops: config.stops.map((stop) => ({
      position: stop.position,
      color: { ...stop.color },
    })),
  };
}

export function normalizePalette(config: PaletteConfig): PaletteConfig {
  const stops = [...config.stops]
    .map((stop) => ({
      position: clampUnit(stop.position),
      color: normalizeColor(stop.color),
    }))
    .sort((left, right) => left.position - right.position);

  return {
    ...config,
    offset: readPaletteOffset(config),
    scale: Number.isFinite(config.scale) && Math.abs(config.scale) > Number.EPSILON ? config.scale : 1,
    stops,
  };
}

export function validatePalette(config: PaletteConfig): PaletteValidationIssue[] {
  const issues: PaletteValidationIssue[] = [];
  const normalized = normalizePalette(config);

  if (normalized.stops.length < MIN_STOPS) {
    issues.push({ message: 'A palette needs at least two colour stops.' });
  }

  for (let index = 0; index < normalized.stops.length; index += 1) {
    const stop = normalized.stops[index];

    if (index > 0 && stop.position < normalized.stops[index - 1].position) {
      issues.push({ message: 'Palette stops must stay ordered from left to right.' });
      break;
    }
  }

  if (!Number.isFinite(config.scale) || Math.abs(config.scale) <= Number.EPSILON) {
    issues.push({ message: 'Palette scale must be a finite value away from zero.' });
  }

  return issues;
}

export function addPaletteStop(config: PaletteConfig, position = 0.5): PaletteConfig {
  const normalized = normalizePalette(config);
  const clampedPosition = clampUnit(position);
  const left = findStopBefore(normalized.stops, clampedPosition);
  const right = findStopAfter(normalized.stops, clampedPosition);
  const color = averageColor(left?.color ?? right?.color ?? defaultColor(), right?.color ?? left?.color ?? defaultColor());

  return normalizePalette({
    ...normalized,
    stops: [...normalized.stops, { position: clampedPosition, color }],
  });
}

export function removePaletteStop(config: PaletteConfig, index: number): PaletteConfig {
  if (config.stops.length <= MIN_STOPS) {
    return normalizePalette(config);
  }

  return normalizePalette({
    ...config,
    stops: config.stops.filter((_, stopIndex) => stopIndex !== index),
  });
}

export function updatePaletteStopPosition(
  config: PaletteConfig,
  index: number,
  position: number,
): PaletteConfig {
  return normalizePalette({
    ...config,
    stops: config.stops.map((stop, stopIndex) => (
      stopIndex === index
        ? { ...stop, position: clampUnit(position) }
        : stop
    )),
  });
}

export function updatePaletteStopColor(
  config: PaletteConfig,
  index: number,
  color: RgbaColor,
): PaletteConfig {
  return normalizePalette({
    ...config,
    stops: config.stops.map((stop, stopIndex) => (
      stopIndex === index
        ? { ...stop, color: normalizeColor(color) }
        : stop
    )),
  });
}

export function reversePalette(config: PaletteConfig): PaletteConfig {
  return normalizePalette({
    ...config,
    stops: [...config.stops]
      .map((stop) => ({
        position: 1 - stop.position,
        color: { ...stop.color },
      }))
      .reverse(),
  });
}

export function cyclePaletteRepeatMode(
  repeatMode: PaletteRepeatMode,
): PaletteRepeatMode {
  switch (repeatMode) {
    case 'clamp':
      return 'repeat';
    case 'repeat':
      return 'mirror';
    case 'mirror':
    default:
      return 'clamp';
  }
}

export function paletteToCssGradient(config: PaletteConfig): string {
  const normalized = normalizePalette(config);
  const stops = normalized.stops
    .map((stop) => `${rgbaToCss(stop.color)} ${Math.round(stop.position * 100)}%`)
    .join(', ');

  return `linear-gradient(90deg, ${stops})`;
}

export function rgbaToHex(color: RgbaColor): string {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function hexToRgba(hex: string): RgbaColor {
  const value = hex.replace('#', '');
  const expanded = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value.padEnd(6, '0').slice(0, 6);

  return {
    r: parseInt(expanded.slice(0, 2), 16) / 255,
    g: parseInt(expanded.slice(2, 4), 16) / 255,
    b: parseInt(expanded.slice(4, 6), 16) / 255,
    a: 1,
  };
}

function findStopBefore(stops: PaletteStop[], position: number): PaletteStop | null {
  for (let index = stops.length - 1; index >= 0; index -= 1) {
    if (stops[index].position <= position) {
      return stops[index];
    }
  }

  return null;
}

function findStopAfter(stops: PaletteStop[], position: number): PaletteStop | null {
  for (const stop of stops) {
    if (stop.position >= position) {
      return stop;
    }
  }

  return null;
}

function averageColor(left: RgbaColor, right: RgbaColor): RgbaColor {
  return {
    r: (left.r + right.r) / 2,
    g: (left.g + right.g) / 2,
    b: (left.b + right.b) / 2,
    a: (left.a + right.a) / 2,
  };
}

function normalizeColor(color: RgbaColor): RgbaColor {
  return {
    r: clampUnit(color.r),
    g: clampUnit(color.g),
    b: clampUnit(color.b),
    a: clampUnit(color.a),
  };
}

function defaultColor(): RgbaColor {
  return { r: 0.5, g: 0.5, b: 0.5, a: 1 };
}

function rgbaToCss(color: RgbaColor): string {
  return `rgba(${Math.round(clampUnit(color.r) * 255)}, ${Math.round(clampUnit(color.g) * 255)}, ${Math.round(clampUnit(color.b) * 255)}, ${clampUnit(color.a).toFixed(3)})`;
}

function toHex(channel: number): string {
  return Math.round(clampUnit(channel) * 255).toString(16).padStart(2, '0');
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
