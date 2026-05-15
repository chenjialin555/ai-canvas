import type { RefObject } from "react";
import { useEffect } from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { styleRotaterAnchor } from "../utils/transformerAnchors";

type UseStageTransformerArgs = {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRef: RefObject<Konva.Transformer | null>;
  selectedIds: string[];
  editingTextId: string | null;
  selectionHasGroup: boolean;
};

/**
 * 将 Transformer 绑定到当前选中的 Konva 节点，并处理 transform 起止时的浮条抑制与旋转柄样式。
 */
export function useStageTransformer({
  stageRef,
  transformerRef,
  selectedIds,
  editingTextId,
  selectionHasGroup,
}: UseStageTransformerArgs) {
  useEffect(() => {
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (!stage || !tr) return;

    const state = useEditorStore.getState();

    if (state.editingTextId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const nodes = state.selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    tr.nodes(nodes);
    tr.rotateEnabled(!selectionHasGroup);
    tr.getLayer()?.batchDraw();
  }, [stageRef, transformerRef, selectedIds, editingTextId, selectionHasGroup]);

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const onStart = () => {
      useEditorStore.getState().setFloatingToolbarSuppressed(true);
    };
    const onEnd = () => {
      useEditorStore.getState().setFloatingToolbarSuppressed(false);
      requestAnimationFrame(() => {
        transformerRef.current?.forceUpdate();
        requestAnimationFrame(() => {
          const tr2 = transformerRef.current;
          if (!tr2) return;
          const rot = tr2.findOne(function (this: Konva.Node) {
            const n = this.name();
            return typeof n === "string" && n.startsWith("rotater");
          });
          if (rot) styleRotaterAnchor(rot, tr2);
          tr2.getLayer()?.batchDraw();
        });
      });
    };
    tr.on("transformstart", onStart);
    tr.on("transformend", onEnd);
    return () => {
      tr.off("transformstart", onStart);
      tr.off("transformend", onEnd);
    };
  }, [transformerRef, selectedIds, editingTextId]);
}
