import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Group,
  Circle,
} from "react-konva";
import Konva from "konva";
import { nanoid } from "nanoid";
import { getImageDefaults, useEditorStore } from "../editor/store";
import type { CanvasElement, ImageElement } from "../editor/types";
import { imageOutputPortOffset } from "../workflow/nodeLayout";
import { PORT_COLORS } from "../workflow/portColors";
import { NodePicker } from "./workflow/NodePicker";
import { WorkflowNodeView } from "./workflow/WorkflowNodeView";
import type { GuideLine } from "../canvas/types";
import { BackgroundLayer } from "../canvas/layers/BackgroundLayer";
import { ContentLayer } from "../canvas/layers/ContentLayer";
import { InteractionLayer } from "../canvas/layers/InteractionLayer";
import { screenToWorld } from "../canvas/utils/coordinates";
import { ElementNode } from "../canvas/elements/ElementNode";
import { useCanvasPanZoom } from "../canvas/hooks/useCanvasPanZoom";
import { useMarqueeSelection } from "../canvas/hooks/useMarqueeSelection";
import { useStageTransformer } from "../canvas/hooks/useStageTransformer";
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

/** Stage 的 dragend 会冒泡；拖元素时 e.target 是 Group，不能把它的 x/y 当成 pan */
function shouldApplyPanFromStageDragEnd(target: Konva.Node): boolean {
  let cur: Konva.Node | null = target;
  while (cur) {
    const cls = cur.getClassName?.();
    if (cls === "Transformer") return false;
    if (cur.name?.() === "editable-node") return false;
    if (cls === "Stage") return true;
    cur = cur.getParent();
  }
  return true;
}

export function StageCanvas(props: StageCanvasProps) {
  const localStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = props.stageRefExternal ?? localStageRef;
  const transformerRef = useRef<Konva.Transformer | null>(null);

  const {
    selectedIds,
    zoom,
    pan,
    editingTextId,
  } = useEditorStore();

  const page = useEditorStore((s) =>
    s.pages.find((p) => p.id === s.activePageId),
  )!;
  const workflowConnecting = useEditorStore((s) => s.workflowConnecting);
  const workflowNodePicker = useEditorStore((s) => s.workflowNodePicker);

  const elements = page.elements;

  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [spacePan, setSpacePan] = useState(false);

  const { handleWheel } = useCanvasPanZoom(stageRef);
  const {
    isSelecting,
    selection,
    selectionBox,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useMarqueeSelection({
    stageRef,
    zoom,
    pan,
    elements,
    spacePanActive: spacePan,
  });
  const { handleStageDblClick } = useStageWorkflowDblClick(stageRef, zoom, pan);
  const stageWidth = Math.max(400, window.innerWidth - 260 - 294);
  const stageHeight = Math.max(300, window.innerHeight - 48 - 34);

  const selectionHasGroup = selectedIds.some(
    (id) => page.elements.find((e) => e.id === id)?.type === "group",
  );

  useStageTransformer({
    stageRef,
    transformerRef,
    selectedIds,
    elements,
    editingTextId,
    selectionHasGroup,
  });

  useEffect(() => {
    function isTypingTarget() {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget()) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) {
          setSpacePan(true);
        }
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
      if (e.code === "Space") {
        setSpacePan(false);
      }
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
          zoom: store.zoom,
          pan: store.pan,
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
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={
          spacePan || (!isSelecting && !workflowConnecting.active)
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

          if (!shouldApplyPanFromStageDragEnd(e.target as Konva.Node)) return;

          useEditorStore.getState().setPan({
            x: stage.x(),
            y: stage.y(),
          });
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleStageDblClick}
      >
        {/* 合并为 3 个 Layer，避免 Konva「>5 layers」性能警告；绘制顺序与原先多 Layer 一致 */}
        <BackgroundLayer zoom={zoom} page={page} />

        <ContentLayer>
          {elements
            .filter((el) => !el.parentId)
            .map((el) => (
              <ElementNode
                key={el.id}
                element={el}
                setGuides={setGuides}
                onOpenCropEditor={props.onOpenCropEditor}
              />
            ))}
          {/* 图片端口在 AI 节点之下，避免挡住已有节点的输入口点击 */}
          <ImageWorkflowPortsOverlay
            images={elements.filter(
              (e): e is ImageElement =>
                e.type === "image" && e.visible && !e.parentId,
            )}
          />
          {page.aiNodes.map((node) => (
            <WorkflowNodeView key={node.id} node={node} zoom={zoom} />
          ))}
        </ContentLayer>

        <InteractionLayer
          guides={guides}
          selectionVisible={selection.visible}
          selectionBox={selectionBox}
          selectionHasGroup={selectionHasGroup}
          transformerRef={transformerRef}
          workflowConnecting={workflowConnecting}
          page={page}
          zoom={zoom}
        />
      </Stage>
      {workflowNodePicker.open &&
        stageRef.current &&
        (() => {
          const st = stageRef.current!;
          const r = st.container().getBoundingClientRect();
          const wx = workflowNodePicker.x;
          const wy = workflowNodePicker.y;
          return (
            <NodePicker
              screenX={r.left + pan.x + wx * zoom}
              screenY={r.top + pan.y + wy * zoom}
              onClose={() => {
                useEditorStore.getState().closeWorkflowNodePicker();
                useEditorStore.getState().cancelWorkflowConnecting();
              }}
            />
          );
        })()}
    </div>
  );
}

function ImageWorkflowPortsOverlay(props: { images: ImageElement[] }) {
  const startWfConn = useEditorStore((s) => s.startWorkflowConnecting);

  return (
    <>
      {props.images.map((element) => (
        <Group
          key={`img-wf-port-${element.id}`}
          x={element.x}
          y={element.y}
          rotation={element.rotation}
        >
          {(["image", "mask"] as const).map((pid) => {
            const o = imageOutputPortOffset(pid, element.width, element.height);
            const disabled = pid === "mask" && !element.aiMask;
            const col =
              pid === "image"
                ? PORT_COLORS.image
                : disabled
                  ? "#cbd5e1"
                  : PORT_COLORS.mask;
            return (
              <Circle
                key={pid}
                x={o.x}
                y={o.y}
                radius={disabled ? 5 : 8}
                fill={col}
                stroke="#fff"
                strokeWidth={2}
                opacity={disabled ? 0.45 : 1}
                listening={!element.locked && !disabled}
                onMouseDown={(e) => {
                  if (disabled || element.locked) return;
                  e.cancelBubble = true;
                  const stage = e.target.getStage();
                  if (!stage) return;
                  const pos = stage.getRelativePointerPosition();
                  if (!pos) return;
                  startWfConn(
                    {
                      kind: "image-element",
                      elementId: element.id,
                      portId: pid,
                    },
                    pos.x,
                    pos.y,
                  );
                }}
              />
            );
          })}
        </Group>
      ))}
    </>
  );
}

