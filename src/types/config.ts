export const SCHEMA_VERSION = 1 as const;
export const NAVIGATION_SCHEMA_VERSION = 1 as const;
export const WAYPOINT_SCHEMA_VERSION = 1 as const;
export const COMPARISON_SCHEMA_VERSION = 1 as const;
export const ANIMATION_SCHEMA_VERSION = 1 as const;

export interface DoubleSingle {
  hi: number;
  lo: number;
}

export interface DoubleSingleComplex {
  re: DoubleSingle;
  im: DoubleSingle;
}

export type FormulaId = 'mandelbrot' | 'julia' | 'burningShip' | 'tricorn';
export type ColouringAlgorithmId = 'smoothEscapeTime' | 'orbitTrap';
export type PaletteInterpolationMode = 'linear' | 'smooth' | 'cubic';
export type PaletteRepeatMode = 'clamp' | 'repeat' | 'mirror';
export type NavigationActionId =
  | 'moveUp'
  | 'moveLeft'
  | 'moveDown'
  | 'moveRight'
  | 'zoomIn'
  | 'zoomOut'
  | 'rotateLeft'
  | 'rotateRight'
  | 'precisionModifier'
  | 'boostModifier'
  | 'resetView'
  | 'juliaRealDecrease'
  | 'juliaRealIncrease'
  | 'juliaImaginaryIncrease'
  | 'juliaImaginaryDecrease';
export type WaypointSource = 'curated' | 'discovered' | 'user';
export type ComparisonMode = 'split' | 'wipe' | 'overlay' | 'difference';
export type ComparisonSide = 'left' | 'right';
export type AnimationEasing = 'linear' | 'easeInOut';
export type NavigationEventPhase = 'start' | 'end';

export interface ViewportConfig {
  centre: DoubleSingleComplex;
  scale: DoubleSingle;
  rotation: number;
  aspectRatio: number;
}

export interface FractalConfig {
  formulaId: FormulaId;
  parameters: Record<string, number>;
  maxIterations: number;
  bailout: number;
}

export interface ColouringConfig {
  algorithmId: ColouringAlgorithmId;
  parameters: Record<string, number>;
}

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PaletteStop {
  position: number;
  color: RgbaColor;
}

export interface PaletteConfig {
  interpolation: PaletteInterpolationMode;
  repeatMode: PaletteRepeatMode;
  offset: number;
  scale: number;
  stops: PaletteStop[];
}

export interface QualityConfig {
  pixelDensity: number;
}

export interface NavigationBinding {
  action: NavigationActionId;
  key: string;
}

export interface NavigationSettings {
  schemaVersion: typeof NAVIGATION_SCHEMA_VERSION;
  bindings: NavigationBinding[];
  panSpeed: number;
  zoomSpeed: number;
  rotationSpeed: number;
  boostMultiplier: number;
  precisionMultiplier: number;
}

export interface RenderConfig {
  schemaVersion: typeof SCHEMA_VERSION;
  viewport: ViewportConfig;
  fractal: FractalConfig;
  colouring: ColouringConfig;
  palette: PaletteConfig;
  quality: QualityConfig;
}

export interface Waypoint {
  schemaVersion: typeof WAYPOINT_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  renderConfig: RenderConfig;
  tags: string[];
  source: WaypointSource;
  interestingnessScore?: number;
  thumbnailDataUrl?: string;
  createdAt: string;
}

export interface ComparisonConfig {
  schemaVersion: typeof COMPARISON_SCHEMA_VERSION;
  mode: ComparisonMode;
  synchroniseViewport: boolean;
  wipe: number;
  overlayOpacity: number;
  activeSide: ComparisonSide;
  left: RenderConfig;
  right: RenderConfig;
}

export interface AnimationKeyframe {
  id: string;
  time: number;
  label: string;
  renderConfig: RenderConfig;
}

export interface AnimationClip {
  schemaVersion: typeof ANIMATION_SCHEMA_VERSION;
  name: string;
  durationMs: number;
  fps: number;
  easing: AnimationEasing;
  keyframes: AnimationKeyframe[];
}

export interface RecordedNavigationEvent {
  timestampMs: number;
  action: NavigationActionId;
  phase: NavigationEventPhase;
}
