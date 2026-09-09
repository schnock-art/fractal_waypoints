import { sampleCpuPixelColor } from '../rendering/fallback/CpuRenderCoordinator';
import type { RenderConfig } from '../types/config';

const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 96;
const ROWS_PER_YIELD = 8;

export async function renderWaypointThumbnail(config: RenderConfig): Promise<string | undefined> {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const context = canvas.getContext('2d');

  if (!context) {
    return undefined;
  }

  const imageData = context.createImageData(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  const scale = config.viewport.scale.hi + config.viewport.scale.lo;
  const centreRe = config.viewport.centre.re.hi + config.viewport.centre.re.lo;
  const centreIm = config.viewport.centre.im.hi + config.viewport.centre.im.lo;
  const cosine = Math.cos(config.viewport.rotation);
  const sine = Math.sin(config.viewport.rotation);
  const horizontalStep = config.viewport.aspectRatio / THUMBNAIL_WIDTH;
  const horizontalStart = -0.5 * config.viewport.aspectRatio;

  for (let y = 0; y < THUMBNAIL_HEIGHT; y += 1) {
    const normalizedY = 0.5 - (y / THUMBNAIL_HEIGHT);

    for (let x = 0; x < THUMBNAIL_WIDTH; x += 1) {
      const normalizedX = horizontalStart + (x * horizontalStep);
      const real = centreRe + (scale * ((normalizedX * cosine) - (normalizedY * sine)));
      const imaginary = centreIm + (scale * ((normalizedX * sine) + (normalizedY * cosine)));
      const color = sampleCpuPixelColor(config, real, imaginary);
      const offset = (y * THUMBNAIL_WIDTH * 4) + (x * 4);

      imageData.data[offset] = toByte(color.r);
      imageData.data[offset + 1] = toByte(color.g);
      imageData.data[offset + 2] = toByte(color.b);
      imageData.data[offset + 3] = 255;
    }

    if (y % ROWS_PER_YIELD === ROWS_PER_YIELD - 1) {
      await yieldToBrowser();
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function toByte(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
