import { describe, expect, it, vi } from 'vitest';

import { probeCanvasWebGpuContext } from '../src/rendering/RenderCoordinator';

describe('render coordinator probing', () => {
  it('checks WebGPU canvas support on a fresh probe canvas', () => {
    const getContext = vi.fn((contextId: string) => contextId === 'webgpu' ? {} : null);
    const createElement = vi.fn(() => ({
      getContext,
    }) as unknown as HTMLCanvasElement);

    const supported = probeCanvasWebGpuContext({
      createElement,
    });

    expect(supported).toBe(true);
    expect(createElement).toHaveBeenCalledWith('canvas');
    expect(getContext).toHaveBeenCalledWith('webgpu');
  });

  it('returns false when the probe canvas cannot create a WebGPU context', () => {
    const supported = probeCanvasWebGpuContext({
      createElement: () => ({
        getContext: () => null,
      }) as unknown as HTMLCanvasElement,
    });

    expect(supported).toBe(false);
  });
});
