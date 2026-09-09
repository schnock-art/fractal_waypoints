import type { RenderConfig } from '../types/config';
import type { RendererDiagnostics } from './diagnostics';

export interface RenderSurface {
  resize(width: number, height: number): void;
  render(config: RenderConfig): Promise<void>;
  destroy(): void;
}

export interface RenderCoordinator {
  backendLabel: string;
  interactive: boolean;
  createSurface(canvas: HTMLCanvasElement): Promise<RenderSurface>;
}

export interface RenderCoordinatorSelection {
  coordinator: RenderCoordinator;
  diagnostics: RendererDiagnostics;
}
