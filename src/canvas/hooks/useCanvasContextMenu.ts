import type { RefObject } from "react";
import { useCallback } from "react";
import type Konva from "konva";

export type CanvasContextMenuTargetKind = "empty" | "element" | "workflow-node";

export type CanvasContextMenuOpenPayload = {
  x: number;
  y: number;
  targetId: string | null;
  targetKind: CanvasContextMenuTargetKind;
};

function resolveTargetFromHit(hit: Konva.Node | null): {
  targetId: string | null;
  targetKind: CanvasContextMenuTargetKind;
} {
  if (!hit) return { targetId: null, targetKind: "empty" };

  const wf = hit.findAncestor(".workflow-node", true);
  const wfId = wf?.id();
  if (wfId) return { targetId: wfId, targetKind: "workflow-node" };

  const el = hit.findAncestor(".editable-node", true);
  const elId = el?.id() || hit.id();
  if (elId) return { targetId: elId, targetKind: "element" };

  return { targetId: null, targetKind: "empty" };
}

export type UseCanvasContextMenuOptions = {
  stageRef: RefObject<Konva.Stage | null>;
  onOpenMenu: (payload: CanvasContextMenuOpenPayload) => void;
};

/**
 * 画布容器右键：阻止默认菜单、Stage 坐标命中、区分画布元素 / 工作流节点 / 空白。
 */
export function useCanvasContextMenu({
  stageRef,
  onOpenMenu,
}: UseCanvasContextMenuOptions) {
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.container().getBoundingClientRect();
      const pointer = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const hit = stage.getIntersection(pointer);
      const { targetId, targetKind } = resolveTargetFromHit(hit);
      onOpenMenu({
        x: e.clientX,
        y: e.clientY,
        targetId,
        targetKind,
      });
    },
    [stageRef, onOpenMenu],
  );

  return { onContextMenu };
}
