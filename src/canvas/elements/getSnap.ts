import type { CanvasElement } from "../../editor/types";
import type { GuideLine } from "../types";

export function getSnap(
  moving: CanvasElement,
  others: CanvasElement[],
): { x: number; y: number; guides: GuideLine[] } {
  const threshold = 6;

  let nextX = moving.x;
  let nextY = moving.y;
  const guides: GuideLine[] = [];

  const m = {
    left: moving.x,
    right: moving.x + moving.width,
    centerX: moving.x + moving.width / 2,
    top: moving.y,
    bottom: moving.y + moving.height,
    centerY: moving.y + moving.height / 2,
  };

  for (const target of others) {
    if (!target.visible || target.id === moving.id) continue;

    const t = {
      left: target.x,
      right: target.x + target.width,
      centerX: target.x + target.width / 2,
      top: target.y,
      bottom: target.y + target.height,
      centerY: target.y + target.height / 2,
    };

    const verticalChecks = [
      { a: m.left, b: t.left, offset: 0 },
      { a: m.right, b: t.right, offset: moving.width },
      { a: m.centerX, b: t.centerX, offset: moving.width / 2 },
      { a: m.left, b: t.right, offset: 0 },
      { a: m.right, b: t.left, offset: moving.width },
    ];

    for (const check of verticalChecks) {
      if (Math.abs(check.a - check.b) <= threshold) {
        nextX = check.b - check.offset;
        guides.push({ type: "vertical", position: check.b });
        break;
      }
    }

    const horizontalChecks = [
      { a: m.top, b: t.top, offset: 0 },
      { a: m.bottom, b: t.bottom, offset: moving.height },
      { a: m.centerY, b: t.centerY, offset: moving.height / 2 },
      { a: m.top, b: t.bottom, offset: 0 },
      { a: m.bottom, b: t.top, offset: moving.height },
    ];

    for (const check of horizontalChecks) {
      if (Math.abs(check.a - check.b) <= threshold) {
        nextY = check.b - check.offset;
        guides.push({ type: "horizontal", position: check.b });
        break;
      }
    }
  }

  return {
    x: Math.round(nextX),
    y: Math.round(nextY),
    guides,
  };
}
