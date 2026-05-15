import { useMemo, type RefObject } from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { screenToWorld } from "../utils/coordinates";
import { createRafBatcher } from "../utils/rafBatcher";

type ViewportUpdate = {
  zoom: number;
  pan: { x: number; y: number };
};

/**
 * 滚轮缩放（以指针为锚点）；pan/zoom 经 RAF 合并，每帧最多写 store 一次。
 */
export function useCanvasPanZoom(stageRef: RefObject<Konva.Stage | null>) {
  const scheduleViewport = useMemo(
    () =>
      createRafBatcher<ViewportUpdate>(({ zoom, pan }) => {
        const store = useEditorStore.getState();
        store.setZoom(zoom);
        store.setPan(pan);
      }),
    [],
  );

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

    scheduleViewport({
      zoom: clamped,
      pan: {
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      },
    });
  }

  return { handleWheel };
}
