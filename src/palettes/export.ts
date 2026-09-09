import { buildPaletteLut } from './sampler';
import type { PaletteConfig } from '../types/config';

export function downloadPalettePng(config: PaletteConfig, filename = 'palette.png'): void {
  const canvas = document.createElement('canvas');
  const width = 512;
  const height = 48;
  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  canvas.width = width;
  canvas.height = height;

  const lut = buildPaletteLut(config, width);
  const imageData = context.createImageData(width, height);

  for (let x = 0; x < width; x += 1) {
    const lutOffset = x * 4;
    for (let y = 0; y < height; y += 1) {
      const offset = ((y * width) + x) * 4;
      imageData.data[offset] = lut[lutOffset];
      imageData.data[offset + 1] = lut[lutOffset + 1];
      imageData.data[offset + 2] = lut[lutOffset + 2];
      imageData.data[offset + 3] = lut[lutOffset + 3];
    }
  }

  context.putImageData(imageData, 0, 0);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}
