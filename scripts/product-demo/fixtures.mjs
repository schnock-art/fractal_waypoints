const DEMO_RENDER_CONFIG = {
  schemaVersion: 1,
  viewport: {
    centre: {
      re: { hi: -0.75, lo: 0 },
      im: { hi: 0, lo: 0 },
    },
    scale: { hi: 2.8, lo: 0 },
    rotation: 0,
    aspectRatio: 16 / 9,
  },
  fractal: {
    formulaId: 'mandelbrot',
    parameters: {},
    maxIterations: 180,
    bailout: 32,
  },
  colouring: {
    algorithmId: 'smoothEscapeTime',
    parameters: { density: 0.032 },
  },
  palette: {
    interpolation: 'smooth',
    repeatMode: 'repeat',
    offset: 0,
    scale: 1,
    stops: [
      { position: 0, color: { r: 0.03, g: 0.05, b: 0.16, a: 1 } },
      { position: 0.2, color: { r: 0.12, g: 0.34, b: 0.72, a: 1 } },
      { position: 0.48, color: { r: 0.23, g: 0.78, b: 0.84, a: 1 } },
      { position: 0.72, color: { r: 0.98, g: 0.76, b: 0.31, a: 1 } },
      { position: 1, color: { r: 0.98, g: 0.32, b: 0.23, a: 1 } },
    ],
  },
  quality: { pixelDensity: 1 },
};

export const demoCanvasPoints = {
  juliaSeed: { x: 340, y: 220 },
  juliaFocus: { x: 120, y: 120 },
};

export function createDemoUrl(baseUrl) {
  const isAbsoluteUrl = /^[a-z][a-z\d+.-]*:/i.test(baseUrl);
  const url = new URL(baseUrl, 'http://demo.local');
  const encodedConfig = Buffer.from(JSON.stringify(DEMO_RENDER_CONFIG), 'utf8').toString('base64url');
  url.searchParams.set('view', encodedConfig);
  return isAbsoluteUrl ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}
