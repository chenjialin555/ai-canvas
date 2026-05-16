import type { RefObject } from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { screenToWorld } from "../utils/coordinates";

function isUnderTransformer(node: Konva.Node | null): boolean {
  let n: Konva.Node | null = node;
  while (n) {
    if (n.getClassName?.() === "Transformer") return true;
    n = n.getParent();
  }
  return false;
}

/**
 * 双击**空白画布**打开工作流节点选择器（世界坐标）。
 *
 * 不能依赖 `e.target === stage`：部分环境下事件目标与命中不一致，会导致
 * 双击图片等元素时仍打开节点选择器，与图片双击打开裁剪等叠成「两个窗口」。
 */
export function useStageWorkflowDblClick(
  stageRef: RefObject<Konva.Stage | null>,
) {
  function handleStageDblClick(_e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const hit = stage.getIntersection(pointer);
    if (hit) {
      if (isUnderTransformer(hit)) return;
      if (hit.findAncestor(".editable-node", true)) return;
      if (hit.findAncestor(".workflow-node", true)) return;
    }

    const world = screenToWorld(pointer, {
      zoom: stage.scaleX(),
      pan: { x: stage.x(), y: stage.y() },
    });
    useEditorStore.getState().openWorkflowNodePickerAtWorld(world.x, world.y);
  }

  return { handleStageDblClick };
}
