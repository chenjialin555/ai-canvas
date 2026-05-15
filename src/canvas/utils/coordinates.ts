export type Point = {
  x: number;
  y: number;
};

export type Viewport = {
  zoom: number;
  pan: Point;
};

/** Stage 内指针坐标（与 `getPointerPosition()` 一致）→ 世界坐标 */
export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.pan.x) / viewport.zoom,
    y: (point.y - viewport.pan.y) / viewport.zoom,
  };
}

/** 世界坐标 → Stage 内容坐标（未加容器 `getBoundingClientRect` 偏移） */
export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.pan.x,
    y: point.y * viewport.zoom + viewport.pan.y,
  };
}
