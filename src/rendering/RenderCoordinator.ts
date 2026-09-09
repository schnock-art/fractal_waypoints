import { buildRendererDiagnostics, type RendererDiagnosticsSnapshot } from './diagnostics';
import { createCpuRenderCoordinator } from './fallback/CpuRenderCoordinator';
import type { RenderCoordinatorSelection } from './types';
import { createWebGpuRenderCoordinator } from './webgpu/WebGpuRenderCoordinator';

let coordinatorPromise: Promise<RenderCoordinatorSelection> | null = null;

export function getRenderCoordinator(canvas: HTMLCanvasElement): Promise<RenderCoordinatorSelection> {
  if (!coordinatorPromise) {
    coordinatorPromise = selectRenderCoordinator(canvas);
  }

  return coordinatorPromise;
}

async function selectRenderCoordinator(
  canvas: HTMLCanvasElement,
): Promise<RenderCoordinatorSelection> {
  const snapshot: RendererDiagnosticsSnapshot = {
    isSecureContext: window.isSecureContext,
    hasNavigatorGpu: 'gpu' in navigator,
    hasAdapter: false,
    hasCanvasWebGpuContext: false,
    locationProtocol: window.location.protocol,
    userAgent: navigator.userAgent,
  };

  if (!snapshot.isSecureContext) {
    return {
      coordinator: createCpuRenderCoordinator(),
      diagnostics: buildRendererDiagnostics('insecure-context', snapshot, {
        backendLabel: 'CPU fallback',
        interactive: true,
        fallbackActive: true,
      }),
    };
  }

  if (!snapshot.hasNavigatorGpu) {
    return {
      coordinator: createCpuRenderCoordinator(),
      diagnostics: buildRendererDiagnostics('navigator-gpu-missing', snapshot, {
        backendLabel: 'CPU fallback',
        interactive: true,
        fallbackActive: true,
      }),
    };
  }

  snapshot.hasCanvasWebGpuContext = probeCanvasWebGpuContext();
  if (!snapshot.hasCanvasWebGpuContext) {
    return {
      coordinator: createCpuRenderCoordinator(),
      diagnostics: buildRendererDiagnostics('webgpu-context-unavailable', snapshot, {
        backendLabel: 'CPU fallback',
        interactive: true,
        fallbackActive: true,
      }),
    };
  }

  const adapter = await navigator.gpu.requestAdapter();
  snapshot.hasAdapter = adapter !== null;

  if (!adapter) {
    return {
      coordinator: createCpuRenderCoordinator(),
      diagnostics: buildRendererDiagnostics('adapter-unavailable', snapshot, {
        backendLabel: 'CPU fallback',
        interactive: true,
        fallbackActive: true,
      }),
    };
  }

  try {
    const coordinator = await createWebGpuRenderCoordinator(adapter);
    return {
      coordinator,
      diagnostics: buildRendererDiagnostics('ok', snapshot),
    };
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : 'Unknown WebGPU startup failure.';
    const issueCode = failureMessage.includes('WGSL compilation failed')
      ? 'shader-compilation-failed'
      : 'device-request-failed';
    return {
      coordinator: createCpuRenderCoordinator(),
      diagnostics: buildRendererDiagnostics(issueCode, {
        ...snapshot,
        failureMessage,
      }, {
        backendLabel: 'CPU fallback',
        interactive: true,
        fallbackActive: true,
      }),
    };
  }
}

export function probeCanvasWebGpuContext(documentRef: Pick<Document, 'createElement'> = document): boolean {
  const probeCanvas = documentRef.createElement('canvas');
  return probeCanvas.getContext('webgpu') !== null;
}
