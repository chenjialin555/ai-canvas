import "pannellum/build/pannellum.css";
import "pannellum/build/pannellum.js";

export type PannellumViewerInstance = {
  destroy: () => void;
};

export type PannellumViewerOptions = {
  type?: string;
  panorama?: string;
  autoLoad?: boolean;
  showZoomCtrl?: boolean;
};

export function createPannellumViewer(
  container: HTMLElement,
  options: PannellumViewerOptions,
): PannellumViewerInstance {
  return window.pannellum.viewer(container, options);
}
