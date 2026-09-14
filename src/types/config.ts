export const SCHEMA_VERSION = 5 as const;
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

export type FormulaId = 'mandelbrot' | 'julia' | 'burningShip' | 'tricorn' | 'multibrot' | 'newton' | 'nova';
export type MaterialId = 'classic' | 'orbitTrap' | 'topographic' | 'domainColouring' | 'surface' | 'rootBasin' | 'convergenceSpeed';
export type OrbitTrapShape = 'point' | 'line' | 'circle' | 'cross' | 'spiral';
export type OrbitTrapComposition = 'minimum' | 'maximum';
export type OrbitTrapMetric = 'nearest' | 'final';
export type OrbitTrapPaletteMapping = 'signal' | 'distanceBands';
export type LensEffectId = 'exposure' | 'toneMapping' | 'bloom' | 'vignette' | 'grain' | 'colourGrade' | 'sharpen' | 'chromaticAberration';
export type ModulationWaveform = 'constant' | 'sine' | 'triangle' | 'saw';
export type ModulationTarget =
  | 'palette.offset'
  | 'material.orbitAppearance.emission'
  | 'material.orbitTraps[0].rotation'
  | 'material.orbitTraps[1].rotation'
  | 'lens.effects.exposure.amount'
  | 'lens.effects.vignette.amount';
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

export interface MaterialConfig {
  id: MaterialId;
  parameters: Record<string, number>;
  orbitTraps?: OrbitTrapSetConfig;
  orbitAppearance?: OrbitTrapAppearanceConfig;
}

export interface OrbitTrapConfig {
  shape: OrbitTrapShape;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface OrbitTrapSetConfig {
  composition: OrbitTrapComposition;
  traps: OrbitTrapConfig[];
}

export interface OrbitTrapAppearanceConfig {
  metric: OrbitTrapMetric;
  paletteMapping: OrbitTrapPaletteMapping;
  exteriorMix: number;
  interiorMix: number;
  emission: number;
}

export interface LensEffectConfig {
  id: LensEffectId;
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface LensConfig {
  effects: LensEffectConfig[];
}

export interface ParameterModulation {
  id: string;
  target: ModulationTarget;
  waveform: ModulationWaveform;
  amplitude: number;
  frequencyHz: number;
  phase: number;
  offset: number;
  enabled: boolean;
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
  material: MaterialConfig;
  lens: LensConfig;
  modulations: ParameterModulation[];
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
