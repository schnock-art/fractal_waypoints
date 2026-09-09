import type { PaletteConfig, PaletteStop, RgbaColor } from '../types/config';
import { normalizePalette } from './model';

const DEFAULT_COLOR: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };

export function buildPaletteLut(config: PaletteConfig, size = 256): Uint8Array {
  const data = new Uint8Array(size * 4);

  for (let index = 0; index < size; index += 1) {
    const sample = samplePalette(config, index / Math.max(size - 1, 1));
    const offset = index * 4;
    data[offset] = toByte(sample.r);
    data[offset + 1] = toByte(sample.g);
    data[offset + 2] = toByte(sample.b);
    data[offset + 3] = toByte(sample.a);
  }

  return data;
}

export function samplePalette(config: PaletteConfig, value: number): RgbaColor {
  const normalized = normalizePalette(config);
  const stops = sortStops(normalized.stops);

  if (stops.length === 0) {
    return DEFAULT_COLOR;
  }

  const position = normalizePalettePosition(value, normalized);

  if (position <= stops[0].position) {
    return stops[0].color;
  }

  const lastStop = stops[stops.length - 1];
  if (position >= lastStop.position) {
    return lastStop.color;
  }

  const nextIndex = stops.findIndex((stop) => stop.position >= position);
  const right = stops[nextIndex];
  const left = stops[nextIndex - 1];
  const span = Math.max(right.position - left.position, Number.EPSILON);
  const localT = (position - left.position) / span;

  if (config.interpolation === 'cubic' && nextIndex >= 1 && nextIndex < stops.length - 1) {
    const previous = stops[Math.max(nextIndex - 2, 0)];
    const following = stops[Math.min(nextIndex + 1, stops.length - 1)];

    return {
      r: clampUnit(catmullRom(previous.color.r, left.color.r, right.color.r, following.color.r, localT)),
      g: clampUnit(catmullRom(previous.color.g, left.color.g, right.color.g, following.color.g, localT)),
      b: clampUnit(catmullRom(previous.color.b, left.color.b, right.color.b, following.color.b, localT)),
      a: clampUnit(catmullRom(previous.color.a, left.color.a, right.color.a, following.color.a, localT)),
    };
  }

  const easedT = config.interpolation === 'smooth' ? smoothstep(localT) : localT;
  return lerpColor(left.color, right.color, easedT);
}

function normalizePalettePosition(value: number, config: PaletteConfig): number {
  const scaled = (value * config.scale) + config.offset;

  switch (config.repeatMode) {
    case 'repeat':
      return positiveModulo(scaled, 1);
    case 'mirror': {
      const mirrored = positiveModulo(scaled, 2);
      return mirrored > 1 ? 2 - mirrored : mirrored;
    }
    case 'clamp':
    default:
      return clampUnit(scaled);
  }
}

function sortStops(stops: PaletteStop[]): PaletteStop[] {
  return [...stops].sort((left, right) => left.position - right.position);
}

function lerpColor(left: RgbaColor, right: RgbaColor, t: number): RgbaColor {
  return {
    r: lerp(left.r, right.r, t),
    g: lerp(left.g, right.g, t),
    b: lerp(left.b, right.b, t),
    a: lerp(left.a, right.a, t),
  };
}

function lerp(left: number, right: number, t: number): number {
  return left + ((right - left) * t);
}

function smoothstep(value: number): number {
  return value * value * (3 - (2 * value));
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    ((-p0 + p2) * t) +
    ((2 * p0) - (5 * p1) + (4 * p2) - p3) * t2 +
    ((-p0 + (3 * p1) - (3 * p2) + p3) * t3)
  );
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toByte(value: number): number {
  return Math.round(clampUnit(value) * 255);
}
