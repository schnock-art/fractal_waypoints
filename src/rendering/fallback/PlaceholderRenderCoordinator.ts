import { buildPaletteLut } from '../../palettes/sampler';
import type { RenderConfig } from '../../types/config';
import type { RenderCoordinator, RenderSurface } from '../types';

const PALETTE_TEXTURE_SIZE = 256;

export function createPlaceholderRenderCoordinator(): RenderCoordinator {
  return {
    backendLabel: 'Diagnostic placeholder',
    interactive: false,
    async createSurface(canvas: HTMLCanvasElement): Promise<RenderSurface> {
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to create a 2D canvas context for the diagnostic placeholder.');
      }

      return new PlaceholderSurface(canvas, context);
    },
  };
}

class PlaceholderSurface implements RenderSurface {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  resize(width: number, height: number): void {
    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));
  }

  async render(config: RenderConfig): Promise<void> {
    const { context, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#07101e');
    gradient.addColorStop(0.5, '#0f2541');
    gradient.addColorStop(1, '#070912');

    context.clearRect(0, 0, width, height);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    drawBackdrop(context, width, height);
    drawPaletteBand(context, width, height, config);
  }

  destroy(): void {}
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.save();
  context.globalAlpha = 0.22;

  for (let index = 0; index < 7; index += 1) {
    const radius = Math.min(width, height) * (0.08 + (index * 0.05));
    context.beginPath();
    context.strokeStyle = index % 2 === 0 ? '#48b4ff' : '#ff9448';
    context.lineWidth = 1.5;
    context.arc(width * 0.5, height * 0.46, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawPaletteBand(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: RenderConfig,
): void {
  const paletteData = buildPaletteLut(config.palette, PALETTE_TEXTURE_SIZE);
  const bandHeight = Math.max(18, Math.floor(height * 0.06));
  const top = height - bandHeight - 18;

  for (let index = 0; index < PALETTE_TEXTURE_SIZE; index += 1) {
    const offset = index * 4;
    context.fillStyle = `rgba(${paletteData[offset]}, ${paletteData[offset + 1]}, ${paletteData[offset + 2]}, ${paletteData[offset + 3] / 255})`;
    context.fillRect((index / PALETTE_TEXTURE_SIZE) * width, top, Math.ceil(width / PALETTE_TEXTURE_SIZE), bandHeight);
  }
}
