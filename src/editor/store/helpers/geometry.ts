import type { CanvasElement } from "../../types";

export function getBounds(elements: CanvasElement[]) {
  if (!elements.length) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  const left = Math.min(...elements.map((el) => el.x));
  const top = Math.min(...elements.map((el) => el.y));
  const right = Math.max(...elements.map((el) => el.x + el.width));
  const bottom = Math.max(...elements.map((el) => el.y + el.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    right,
    bottom,
    centerX: left + (right - left) / 2,
    centerY: top + (bottom - top) / 2,
  };
}
