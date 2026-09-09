import { writeFile } from 'node:fs/promises';

import gifenc from 'gifenc';
import pngjs from 'pngjs';

const { applyPalette, GIFEncoder, quantize } = gifenc;
const { PNG } = pngjs;

export async function captureGifFrame(page, frames) {
  const screenshot = await page.screenshot();
  frames.push(PNG.sync.read(screenshot));
}

export async function writeGif(frames, outputPath, frameDelayMs = 220, colorCount = 128) {
  const gif = GIFEncoder();

  for (const [index, frame] of frames.entries()) {
    const palette = quantize(frame.data, colorCount);
    const indexedPixels = applyPalette(frame.data, palette);
    gif.writeFrame(indexedPixels, frame.width, frame.height, {
      palette,
      delay: index === frames.length - 1 ? 1_000 : frameDelayMs,
      repeat: 0,
    });
  }

  gif.finish();
  await writeFile(outputPath, gif.bytes());
}
