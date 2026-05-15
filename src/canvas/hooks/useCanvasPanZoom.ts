import type { RefObject } from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { screenToWorld } from "../utils/coordinates";

/**
 * 滚轮缩放（以指针为锚点），逻辑与原先 `StageCanvas` 内联实现一致。
 */
export function useCanvasPanZoom(stageRef: RefObject<Konva.Stage | null>) {
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const store = useEditorStore.getState();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = store.zoom;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.06;
    const nextScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clamped = Math.min(3, Math.max(0.1, nextScale));

    const mousePointTo = screenToWorld(pointer, {
      zoom: oldScale,
      pan: store.pan,
    });

    store.setZoom(clamped);
    store.setPan({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    });
  }

  return { handleWheel };
}
