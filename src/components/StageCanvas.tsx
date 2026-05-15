import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { nanoid } from "nanoid";
import { getImageDefaults, useEditorStore } from "../editor/store";
import type { CanvasElement } from "../editor/types";
import { NodePicker } from "./workflow/NodePicker";
import { CanvasBackgroundLayer } from "../canvas/components/CanvasBackgroundLayer";
import { CanvasPageContent } from "../canvas/components/CanvasPageContent";
import {
  CanvasInteractionLayer,
  type CanvasPointerHandlers,
} from "../canvas/components/CanvasInteractionLayer";
import { screenToWorld } from "../canvas/utils/coordinates";
import { useImperativeViewport } from "../canvas/hooks/useImperativeViewport";
import { useStageWorkflowDblClick } from "../canvas/hooks/useStageWorkflowDblClick";

type StageCanvasProps = {
  onContextMenu: (params: {
    x: number;
    y: number;
    targetId: string | null;
  }) => void;
  stageRefExternal?: MutableRefObject<Konva.Stage | null>;
  onOpenCropEditor?: (imageId: string) => void;
};

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

  const { handleWheel, syncPanFromStageDragEnd } =
    useImperativeViewport(stageRef);
  const { handleStageDblClick } = useStageWorkflowDblClick(stageRef);

  const stageWidth = Math.max(400, window.innerWidth - 260 - 294);
  const stageHeight = Math.max(300, window.innerHeight - 48 - 34);

  useEffect(() => {
    function isTypingTarget() {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget()) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) setSpacePan(true);
        return;
      }

      const state = useEditorStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        state.undo();
      } else if (
        (ctrl && e.key.toLowerCase() === "z" && e.shiftKey) ||
        (ctrl && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        state.redo();
      } else if (ctrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        state.copy();
      } else if (ctrl && e.key.toLowerCase() === "v") {
        e.preventDefault();
        state.paste();
      } else if (ctrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        state.selectAll();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        state.removeSelected();
      } else if (e.key === "Escape") {
        state.cancelWorkflowConnecting();
        state.closeWorkflowNodePicker();
        state.clearCanvasSelection();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpacePan(false);
    }

    function onBlur() {
      setSpacePan(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div
      className={spacePan ? "konva-wrap konva-wrap--space-pan" : "konva-wrap"}
      onContextMenu={(e) => {
        e.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const rect = stage.container().getBoundingClientRect();
        const pointer = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const hit = stage.getIntersection(pointer);
        let targetId: string | null = null;
        if (hit) {
          const parent = hit.findAncestor(".editable-node", true);
          targetId = parent?.id() || hit.id() || null;
        }
        props.onContextMenu({
          x: e.clientX,
          y: e.clientY,
          targetId,
        });
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        const src = await readImageFile(file);
        const stage = stageRef.current;
        if (!stage) return;
        const rect = stage.container().getBoundingClientRect();
        const pointer = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const hit = stage.getIntersection(pointer);
        let targetId: string | null = null;
        if (hit) {
          const parent = hit.findAncestor(".editable-node", true);
          targetId = parent?.id() || hit.id();
        }
        const store = useEditorStore.getState();
        const currentPage = store.getActivePage();
        const target = targetId
          ? currentPage.elements.find((el) => el.id === targetId)
          : null;
        if (target?.type === "image") {
          store.replaceImageKeepFrame(target.id, src);
          store.setSelectedIds([target.id]);
          return;
        }
        const world = screenToWorld(pointer, {
          zoom: stage.scaleX(),
          pan: { x: stage.x(), y: stage.y() },
        });
        store.addElement({
          id: nanoid(),
          type: "image",
          name: "拖入图片",
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 520,
          height: 320,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          src,
          ...getImageDefaults(),
        } as CanvasElement);
      }}
    >
      <Stage
        ref={setStageInstance}
        width={stageWidth}
        height={stageHeight}
        draggable={
          spacePan || (!marqueeSelecting && !workflowConnectingActive)
        }
        onDragStart={(e) => {
          const st = stageRef.current;
          if (st && e.target === st) {
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
