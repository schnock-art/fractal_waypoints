import { getRenderCoordinator } from '../rendering/RenderCoordinator';
import type { AnimationClip, RenderConfig } from '../types/config';
import { generateAnimationFrames } from './interpolation';

export async function exportAnimationImageSequence(
  clip: AnimationClip,
  filenamePrefix = 'fractal-journey',
): Promise<number> {
  const frames = generateAnimationFrames(clip);
  const renderer = await createExportRenderer(frames[0], clip);

  try {
    for (let index = 0; index < frames.length; index += 1) {
      await renderer.render(frames[index]);
      const blob = await canvasToBlob(renderer.canvas, 'image/png');
      downloadBlob(blob, `${filenamePrefix}-${String(index).padStart(4, '0')}.png`);
    }
  } finally {
    renderer.destroy();
  }

  downloadBlob(
    new Blob([JSON.stringify({ frameCount: frames.length, fps: clip.fps }, null, 2)], { type: 'application/json' }),
    `${filenamePrefix}-manifest.json`,
  );

  return frames.length;
}

export async function exportAnimationWebm(
  clip: AnimationClip,
  filename = 'fractal-journey.webm',
): Promise<void> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not available in this browser.');
  }

  const frames = generateAnimationFrames(clip);
  const renderer = await createExportRenderer(frames[0], clip);

  try {
    const stream = renderer.canvas.captureStream(clip.fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const finished = new Promise<void>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Unable to record WebM export.'));
      recorder.onstop = () => {
        downloadBlob(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }), filename);
        resolve();
      };
    });

    recorder.start();

    for (const frame of frames) {
      await renderer.render(frame);
      await wait(Math.max(8, 1000 / clip.fps));
    }

    recorder.stop();
    await finished;
  } finally {
    renderer.destroy();
  }
}

async function createExportRenderer(baseConfig: RenderConfig, clip: AnimationClip) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(1280 * baseConfig.viewport.aspectRatio / Math.max(baseConfig.viewport.aspectRatio, 1)));
  canvas.height = Math.max(1, Math.round(canvas.width / Math.max(baseConfig.viewport.aspectRatio, 0.5)));
  canvas.style.position = 'fixed';
  canvas.style.left = '-99999px';
  canvas.style.top = '0';
  document.body.appendChild(canvas);

  const selection = await getRenderCoordinator(canvas);
  const surface = await selection.coordinator.createSurface(canvas);
  surface.resize(canvas.width, canvas.height);

  return {
    canvas,
    async render(config: RenderConfig) {
      await surface.render(config);
      await wait(0);
    },
    destroy() {
      surface.destroy();
      canvas.remove();
    },
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to capture canvas frame.'));
        return;
      }
      resolve(blob);
    }, type);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}
