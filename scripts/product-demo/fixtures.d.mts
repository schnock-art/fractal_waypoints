export interface DemoCanvasPoint {
  x: number;
  y: number;
}

export declare const demoCanvasPoints: {
  juliaSeed: DemoCanvasPoint;
  juliaFocus: DemoCanvasPoint;
};

export declare function createDemoUrl(baseUrl: string): string;
