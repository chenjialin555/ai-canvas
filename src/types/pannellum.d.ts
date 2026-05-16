declare module "pannellum/build/pannellum.js";

interface Window {
  pannellum: {
    viewer(
      container: HTMLElement,
      options: {
        type?: string;
        panorama?: string;
        autoLoad?: boolean;
        showZoomCtrl?: boolean;
      },
    ): { destroy(): void };
  };
}
