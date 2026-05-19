import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  type RefObject,
} from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { EMPTY_ELEMENTS } from "../../editor/store/shallowEqual";
import { InteractionLayer } from "../layers/InteractionLayer";
import { useMarqueeSelection } from "../hooks/useMarqueeSelection";
import { useStageTransformer } from "../hooks/useStageTransformer";

export type CanvasPointerHandlers = {
  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => void;
};

type Props = {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRef: RefObject<Konva.Transformer | null>;
  spacePanActive: boolean;
};

/** 框选 / Transformer / 临时连线：状态局限在本组件，不拖垮元素层 */
export const CanvasInteractionLayer = forwardRef<CanvasPointerHandlers, Props>(
  function CanvasInteractionLayer(props, ref) {
    const elements = useEditorStore((s) => {
      const page = s.pages.find((p) => p.id === s.activePageId);
      return page?.elements ?? EMPTY_ELEMENTS;
    });
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const editingTextId = useEditorStore((s) => s.editingTextId);
    const workflowConnecting = useEditorStore((s) => s.workflowConnecting);
    const page = useEditorStore((s) =>
      s.pages.find((p) => p.id === s.activePageId),
    );

    const marquee = useMarqueeSelection({
      stageRef: props.stageRef,
      elements,
      spacePanActive: props.spacePanActive,
    });

    useImperativeHandle(
      ref,
      () => ({
        onMouseDown: marquee.handleMouseDown,
        onMouseMove: marquee.handleMouseMove,
        onMouseUp: marquee.handleMouseUp,
      }),
      [
        marquee.handleMouseDown,
        marquee.handleMouseMove,
        marquee.handleMouseUp,
      ],
    );

    const selectionHasGroup = useMemo(
      () =>
        selectedIds.some(
          (id) => elements.find((e) => e.id === id)?.type === "group",
        ),
      [selectedIds, elements],
    );

    useStageTransformer({
      stageRef: props.stageRef,
      transformerRef: props.transformerRef,
      selectedIds,
      editingTextId,
      selectionHasGroup,
    });

    if (!page) return null;

    return (
      <InteractionLayer
        selectionVisible={marquee.selection.visible}
        selectionBox={marquee.selectionBox}
        selectionHasGroup={selectionHasGroup}
        transformerRef={props.transformerRef}
        workflowConnecting={workflowConnecting}
        page={page}
      />
    );
  },
);
