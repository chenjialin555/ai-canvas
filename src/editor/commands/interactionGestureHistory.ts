import { useEditorStore } from "../store";

/**
 * Konva 多选时，Transformer 会把同一手势的 transformstart/transformend
 * 派发到每个被选节点；若每个节点都 `commitHistory()`，撤销栈会一次塞多条重复快照。
 * 用引用计数保证整段手势只提交一次。
 */
let transformGestureDepth = 0;
let dragGestureDepth = 0;

export function gestureHistoryTransformStart(): void {
  transformGestureDepth += 1;
  if (transformGestureDepth === 1) {
    useEditorStore.getState().commitHistory();
  }
}

export function gestureHistoryTransformEnd(): void {
  transformGestureDepth = Math.max(0, transformGestureDepth - 1);
}

export function gestureHistoryDragStart(): void {
  dragGestureDepth += 1;
  if (dragGestureDepth === 1) {
    useEditorStore.getState().commitHistory();
  }
}

export function gestureHistoryDragEnd(): void {
  dragGestureDepth = Math.max(0, dragGestureDepth - 1);
}
