export type RendererIssueCode =
  | 'ok'
  | 'insecure-context'
  | 'navigator-gpu-missing'
  | 'adapter-unavailable'
  | 'webgpu-context-unavailable'
  | 'device-request-failed'
  | 'shader-compilation-failed'
  | 'unknown';

export interface RendererDiagnosticsSnapshot {
  isSecureContext: boolean;
  hasNavigatorGpu: boolean;
  hasAdapter: boolean;
  hasCanvasWebGpuContext: boolean;
  locationProtocol: string;
  userAgent: string;
  failureMessage?: string;
}

export interface RendererDiagnostics {
  backendLabel: string;
  interactive: boolean;
  fallbackActive: boolean;
  code: RendererIssueCode;
  summary: string;
  details: string[];
  hints: string[];
  failureMessage?: string;
}

interface RendererDiagnosticsOptions {
  backendLabel?: string;
  interactive?: boolean;
  fallbackActive?: boolean;
}

export function buildRendererDiagnostics(
  code: RendererIssueCode,
  snapshot: RendererDiagnosticsSnapshot,
  options: RendererDiagnosticsOptions = {},
): RendererDiagnostics {
  const fallbackActive = options.fallbackActive ?? false;

  if (code === 'ok') {
    return {
      backendLabel: options.backendLabel ?? 'WebGPU',
      interactive: options.interactive ?? true,
      fallbackActive,
      code,
      summary: 'WebGPU is available and the renderer is using the GPU path.',
      details: buildDetails(snapshot),
      hints: [],
      failureMessage: snapshot.failureMessage,
    };
  }

  return {
    backendLabel: options.backendLabel ?? 'Diagnostic placeholder',
    interactive: options.interactive ?? false,
    fallbackActive,
    code,
    summary: buildSummary(code, fallbackActive),
    details: buildDetails(snapshot),
    hints: buildHints(code, snapshot, fallbackActive),
    failureMessage: snapshot.failureMessage,
  };
}

function buildSummary(code: RendererIssueCode, fallbackActive: boolean): string {
  switch (code) {
    case 'insecure-context':
      return fallbackActive
        ? 'WebGPU is blocked because the page is not running in a secure context, so the app switched to the CPU fallback renderer.'
        : 'WebGPU is blocked because the page is not running in a secure context.';
    case 'navigator-gpu-missing':
      return fallbackActive
        ? 'This browser session does not expose the WebGPU API on navigator.gpu, so the app switched to the CPU fallback renderer.'
        : 'This browser session does not expose the WebGPU API on navigator.gpu.';
    case 'adapter-unavailable':
      return fallbackActive
        ? 'The browser exposed WebGPU, but requestAdapter() did not return a usable GPU adapter, so the app switched to the CPU fallback renderer.'
        : 'The browser exposed WebGPU, but requestAdapter() did not return a usable GPU adapter.';
    case 'webgpu-context-unavailable':
      return fallbackActive
        ? 'The browser could not create a WebGPU canvas context for this page, so the app switched to the CPU fallback renderer.'
        : 'The browser could not create a WebGPU canvas context for this page.';
    case 'device-request-failed':
      return fallbackActive
        ? 'The browser found an adapter, but requestDevice() failed during renderer startup, so the app switched to the CPU fallback renderer.'
        : 'The browser found an adapter, but requestDevice() failed during renderer startup.';
    case 'shader-compilation-failed':
      return fallbackActive
        ? 'WebGPU started, but the fractal shader failed to compile or the render pipeline could not be created, so the app switched to the CPU fallback renderer.'
        : 'WebGPU started, but the fractal shader failed to compile or the render pipeline could not be created.';
    case 'unknown':
    default:
      return fallbackActive
        ? 'The renderer could not determine a usable WebGPU startup path, so the app switched to the CPU fallback renderer.'
        : 'The renderer could not determine a usable WebGPU startup path.';
  }
}

function buildDetails(snapshot: RendererDiagnosticsSnapshot): string[] {
  return [
    `Secure context: ${snapshot.isSecureContext ? 'yes' : 'no'}`,
    `navigator.gpu present: ${snapshot.hasNavigatorGpu ? 'yes' : 'no'}`,
    `requestAdapter result: ${snapshot.hasAdapter ? 'adapter found' : 'no adapter'}`,
    `Canvas WebGPU context: ${snapshot.hasCanvasWebGpuContext ? 'available' : 'unavailable'}`,
    `Protocol: ${snapshot.locationProtocol}`,
    `Browser: ${snapshot.userAgent}`,
  ];
}

function buildHints(
  code: RendererIssueCode,
  snapshot: RendererDiagnosticsSnapshot,
  fallbackActive: boolean,
): string[] {
  const fallbackHint = fallbackActive
    ? ['The app is still usable through the CPU fallback renderer, but rendering and interaction may feel slower than WebGPU.']
    : [];

  switch (code) {
    case 'insecure-context':
      return [
        ...fallbackHint,
        'Run the app from localhost or HTTPS rather than opening files directly from disk.',
        'If you are using a custom host, make sure the page is served from a secure origin.',
      ];
    case 'navigator-gpu-missing':
      return [
        ...fallbackHint,
        'Try the latest Chrome or Edge release.',
        'Check whether browser flags, extensions, or managed policies disable WebGPU.',
      ];
    case 'adapter-unavailable':
      return [
        ...fallbackHint,
        'Open chrome://gpu or edge://gpu and confirm WebGPU is available for this browser profile.',
        'Restart the browser fully and try again, especially after toggling GPU flags.',
        'If chrome://gpu says WebGPU is hardware accelerated, this usually points to a browser-profile or startup-path issue rather than unsupported hardware.',
      ];
    case 'webgpu-context-unavailable':
      return [
        ...fallbackHint,
        'Try a fresh browser tab or profile in case a browser flag or extension is interfering with canvas setup.',
        'Check whether the page is embedded in an environment that restricts WebGPU canvas access.',
      ];
    case 'device-request-failed':
      return [
        ...fallbackHint,
        'Reload the page and restart the browser in case the GPU process had a transient failure.',
        'Check chrome://gpu for GPU process crashes or driver warnings.',
      ];
    case 'shader-compilation-failed':
      return [
        ...fallbackHint,
        'Open the browser console to inspect the WGSL compiler message from the page.',
        'If the diagnostics mention WGSL parsing or pipeline creation, the problem is in the app shader rather than your GPU support.',
      ];
    case 'unknown':
    default: {
      const generic = [
        ...fallbackHint,
        'Restart the browser and reopen the local dev server URL.',
        'Try the same page in a different supported browser such as Chrome or Edge.',
      ];

      if (!snapshot.isSecureContext) {
        generic.unshift('Serve the app from localhost or HTTPS.');
      }

      return generic;
    }
  }
}
