import type { RefObject } from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { screenToWorld } from "../utils/coordinates";

/**
 * 双击空白 Stage 打开工作流节点选择器（世界坐标）。
 */
export function useStageWorkflowDblClick(
  stageRef: RefObject<Konva.Stage | null>,
) {
  function handleStageDblClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage) return;
    if (e.target !== stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const world = screenToWorld(pointer, {
      zoom: stage.scaleX(),
      pan: { x: stage.x(), y: stage.y() },
    });
    useEditorStore.getState().openWorkflowNodePickerAtWorld(world.x, world.y);
  }

  return { handleStageDblClick };
}
