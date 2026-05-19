/** 指针移动超过该距离才启动 Konva drag（降低双击误触拖拽） */
export const ELEMENT_DRAG_DISTANCE = 8;

/** 拖拽结束位移小于该值则视为点击，不写回 store */
export const ELEMENT_DRAG_COMMIT_PX = 4;

export function isNegligibleDrag(
  dx: number,
  dy: number,
  threshold = ELEMENT_DRAG_COMMIT_PX,
): boolean {
  return Math.hypot(dx, dy) < threshold;
}
