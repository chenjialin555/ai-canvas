import type { RefObject } from "react";
import { useMemo, useState } from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import type { CanvasElement } from "../../editor/types";
import { screenToWorld } from "../utils/coordinates";

type MarqueeRect = {
  visible: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type UseMarqueeSelectionArgs = {
  stageRef: RefObject<Konva.Stage | null>;
  zoom: number;
  pan: { x: number; y: number };
  /** 用于框选结束时的命中列表（与原先闭包 `elements` 一致） */
  elements: CanvasElement[];
  /** 按住空格平移画布时不应开始框选 */
  spacePanActive: boolean;
};

/**
 * 框选 + 工作流连线指针跟随（`mousemove` 内与原先同序）。
 * `mouseup` 内工作流节点选择器 / 取消连线与框选收尾顺序不变。
 */
export function useMarqueeSelection({
  stageRef,
  zoom,
  pan,
  elements,
  spacePanActive,
}: UseMarqueeSelectionArgs) {
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<MarqueeRect>({
    visible: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });

  const selectionBox = useMemo(
    () => ({
      x: Math.min(selection.x1, selection.x2),
      y: Math.min(selection.y1, selection.y2),
      width: Math.abs(selection.x2 - selection.x1),
      height: Math.abs(selection.y2 - selection.y1),
    }),
    [selection.x1, selection.x2, selection.y1, selection.y2],
  );

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (spacePanActive) return;

    const stage = stageRef.current;
    if (!stage) return;

    const clickedOnEmpty = e.target === stage;
    if (!clickedOnEmpty) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const world = screenToWorld(pointer, { zoom, pan });

    setIsSelecting(true);
    useEditorStore.getState().setMarqueeSelecting(true);
    setSelection({
      visible: true,
      x1: world.x,
      y1: world.y,
      x2: world.x,
      y2: world.y,
    });

    if (!e.evt.shiftKey) {
      useEditorStore.getState().clearCanvasSelection();
    }
  }

  function handleMouseMove() {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const world = screenToWorld(pointer, { zoom, pan });

    const st = useEditorStore.getState();
    if (st.workflowConnecting.active) {
      st.updateWorkflowConnectingPointer(world.x, world.y);
    }

    if (!isSelecting) return;

    setSelection((prev) => ({
      ...prev,
      x2: world.x,
      y2: world.y,
    }));
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    const st = useEditorStore.getState();
    if (st.workflowConnecting.active && stage) {
      if (e.target === stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const world = screenToWorld(pointer, { zoom, pan });
          st.openWorkflowNodePicker(world.x, world.y);
        }
      } else {
        st.cancelWorkflowConnecting();
      }
    }

    if (!isSelecting) return;

    useEditorStore.getState().setMarqueeSelecting(false);

    setIsSelecting(false);

    const box = {
      x: Math.min(selection.x1, selection.x2),
      y: Math.min(selection.y1, selection.y2),
      width: Math.abs(selection.x2 - selection.x1),
      height: Math.abs(selection.y2 - selection.y1),
    };

    const selected = elements.filter((el) => {
      if (!el.visible || el.locked || el.parentId) return false;

      return Konva.Util.haveIntersection(box, {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
      });
    });

    setSelectedIds(selected.map((el) => el.id));

    setSelection({
      visible: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
  }

  return {
    isSelecting,
    selection,
    selectionBox,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
