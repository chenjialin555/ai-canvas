import type { MutableRefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { NodePicker } from "../../../features/workflow/components/NodePicker";
import { CanvasBackgroundLayer } from "./CanvasBackgroundLayer";
import { CanvasPageContent } from "./CanvasPageContent";
import {
  CanvasInteractionLayer,
  type CanvasPointerHandlers,
} from "./CanvasInteractionLayer";
import { useImperativeViewport } from "../hooks/useImperativeViewport";
import { useStageWorkflowDblClick } from "../hooks/useStageWorkflowDblClick";
import { useStageKeyboardShortcuts } from "../hooks/useStageKeyboardShortcuts";
import { useCanvasDropImport } from "../hooks/useCanvasDropImport";
import {
  useCanvasContextMenu,
} from "../hooks/useCanvasContextMenu";
import type { CanvasContextMenuOpenPayload } from "../hooks/useCanvasContextMenu";

type StageCanvasProps = {
  onContextMenu: (params: CanvasContextMenuOpenPayload) => void;
  stageRefExternal?: MutableRefObject<Konva.Stage | null>;
  onOpenCropEditor?: (imageId: string) => void;
};

export function StageCanvas(props: StageCanvasProps) {
  const localStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = props.stageRefExternal ?? localStageRef;
  /** 勿在 ref 里读 store 写 scale/position：内联 ref 每次父级重渲染都会跑，会与「滚轮先改 Stage、延迟写 store」打架。 */
  const setStageInstance = useCallback((node: Konva.Stage | null) => {
    if (props.stageRefExternal) props.stageRefExternal.current = node;
    else localStageRef.current = node;
  }, [props.stageRefExternal]);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const pointerRef = useRef<CanvasPointerHandlers | null>(null);

  const workflowConnectingActive = useEditorStore(
    (s) => s.workflowConnecting.active,
  );
  const workflowNodePicker = useEditorStore((s) => s.workflowNodePicker);

  const [spacePan, setSpacePan] = useState(false);
  const marqueeSelecting = useEditorStore((s) => s.marqueeSelecting);

  const { handleWheel, beginStageViewportInteraction, syncPanFromStageDragEnd } =
    useImperativeViewport(stageRef);
  const { handleStageDblClick } = useStageWorkflowDblClick(stageRef);
  const { onDragOver, onDrop } = useCanvasDropImport({ stageRef });
  const { onContextMenu: handleContextMenu } = useCanvasContextMenu({
    stageRef,
    onOpenMenu: props.onContextMenu,
  });

  useStageKeyboardShortcuts({ onSpacePanChange: setSpacePan });

  const stageWidth = Math.max(400, window.innerWidth - 260 - 294);
  const stageHeight = Math.max(300, window.innerHeight - 48 - 34);

  return (
    <div
      className={spacePan ? "konva-wrap konva-wrap--space-pan" : "konva-wrap"}
      onContextMenu={handleContextMenu}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Stage
        ref={setStageInstance}
        width={stageWidth}
        height={stageHeight}
        dragDistance={10}
        draggable={
          spacePan || (!marqueeSelecting && !workflowConnectingActive)
        }
        onDragStart={(e) => {
          const st = stageRef.current;
          if (st && e.target === st) {
            beginStageViewportInteraction();
            useEditorStore.getState().setFloatingToolbarSuppressed(true);
          }
        }}
        onDragEnd={(e) => {
          useEditorStore.getState().setFloatingToolbarSuppressed(false);
          const stage = stageRef.current;
          if (!stage) return;
          // 仅 Stage 自身被拖动时同步 pan；子节点 dragend 若冒泡到此，不得写 store（避免与延迟视口同步打架）
          if (e.target !== stage) return;
          syncPanFromStageDragEnd();
        }}
        onWheel={handleWheel}
        onMouseDown={(e) => pointerRef.current?.onMouseDown(e)}
        onMouseMove={(e) => pointerRef.current?.onMouseMove(e)}
        onMouseUp={(e) => pointerRef.current?.onMouseUp(e)}
        onDblClick={handleStageDblClick}
      >
        <CanvasBackgroundLayer />
        <CanvasPageContent onOpenCropEditor={props.onOpenCropEditor} />
        <CanvasInteractionLayer
          ref={pointerRef}
          stageRef={stageRef}
          transformerRef={transformerRef}
          spacePanActive={spacePan}
        />
      </Stage>

      {workflowNodePicker.open && stageRef.current && (
        <NodePicker
          screenX={(() => {
            const st = stageRef.current!;
            const r = st.container().getBoundingClientRect();
            return r.left + st.x() + workflowNodePicker.x * st.scaleX();
          })()}
          screenY={(() => {
            const st = stageRef.current!;
            const r = st.container().getBoundingClientRect();
            return r.top + st.y() + workflowNodePicker.y * st.scaleY();
          })()}
          onClose={() => {
            useEditorStore.getState().closeWorkflowNodePicker();
            useEditorStore.getState().cancelWorkflowConnecting();
          }}
        />
      )}
    </div>
  );
}
