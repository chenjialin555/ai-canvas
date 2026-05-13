import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Arrow,
  Transformer,
  Group,
  Line,
} from "react-konva";
import Konva from "konva";
import type { SceneContext } from "konva/lib/Context";
import type { Filter } from "konva/lib/Node";
import { nanoid } from "nanoid";
import { fallback, getImageDefaults, useEditorStore } from "../editor/store";
import type { CanvasElement, ImageElement, ImageMaskData, TextElement } from "../editor/types";
import { exportMaskToDataURL } from "../editor/mask";

export type GuideLine = {
  type: "vertical" | "horizontal";
  position: number;
};

type StageCanvasProps = {
  onContextMenu: (params: {
    x: number;
    y: number;
    targetId: string | null;
  }) => void;
  stageRefExternal?: MutableRefObject<Konva.Stage | null>;
  onOpenCropEditor?: (imageId: string) => void;
};

const SRC_FALLBACK: Record<string, string> = {
  "/assets/ref-board-01.jpg": fallback.ref1,
  "/assets/ref-board-02.jpg": fallback.ref2,
  "/assets/interior-01.jpg": fallback.room1,
  "/assets/interior-02.jpg": fallback.room2,
  "/assets/ui-shot-01.jpg": fallback.ui1,
  "/assets/ui-shot-02.jpg": fallback.ui2,
};

function useImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    let cancelled = false;

    const load = (url: string) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!cancelled) setImage(img);
      };
      img.onerror = () => {
        const fb = SRC_FALLBACK[src];
        if (fb && fb !== url) {
          load(fb);
          return;
        }
        if (!cancelled) setImage(null);
      };
      img.src = url;
    };

    load(src);
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getSnap(
  moving: CanvasElement,
  others: CanvasElement[],
): { x: number; y: number; guides: GuideLine[] } {
  const threshold = 6;

  let nextX = moving.x;
  let nextY = moving.y;
  const guides: GuideLine[] = [];

  const m = {
    left: moving.x,
    right: moving.x + moving.width,
    centerX: moving.x + moving.width / 2,
    top: moving.y,
    bottom: moving.y + moving.height,
    centerY: moving.y + moving.height / 2,
  };

  for (const target of others) {
    if (!target.visible || target.id === moving.id) continue;

    const t = {
      left: target.x,
      right: target.x + target.width,
      centerX: target.x + target.width / 2,
      top: target.y,
      bottom: target.y + target.height,
      centerY: target.y + target.height / 2,
    };

    const verticalChecks = [
      { a: m.left, b: t.left, offset: 0 },
      { a: m.right, b: t.right, offset: moving.width },
      { a: m.centerX, b: t.centerX, offset: moving.width / 2 },
      { a: m.left, b: t.right, offset: 0 },
      { a: m.right, b: t.left, offset: moving.width },
    ];

    for (const check of verticalChecks) {
      if (Math.abs(check.a - check.b) <= threshold) {
        nextX = check.b - check.offset;
        guides.push({ type: "vertical", position: check.b });
        break;
      }
    }

    const horizontalChecks = [
      { a: m.top, b: t.top, offset: 0 },
      { a: m.bottom, b: t.bottom, offset: moving.height },
      { a: m.centerY, b: t.centerY, offset: moving.height / 2 },
      { a: m.top, b: t.bottom, offset: 0 },
      { a: m.bottom, b: t.top, offset: moving.height },
    ];

    for (const check of horizontalChecks) {
      if (Math.abs(check.a - check.b) <= threshold) {
        nextY = check.b - check.offset;
        guides.push({ type: "horizontal", position: check.b });
        break;
      }
    }
  }

  return {
    x: Math.round(nextX),
    y: Math.round(nextY),
    guides,
  };
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
    getActivePage,
    selectedIds,
    setSelectedIds,
    zoom,
    pan,
    editingTextId,
  } = useEditorStore();

  const page = getActivePage();
  const elements = page.elements;

  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState({
    visible: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });

  const stageWidth = Math.max(400, window.innerWidth - 260 - 294);
  const stageHeight = Math.max(300, window.innerHeight - 48 - 34);

  const selectionHasGroup = selectedIds.some(
    (id) => page.elements.find((e) => e.id === id)?.type === "group",
  );

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
  }, [selectedIds, elements, editingTextId, selectionHasGroup]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

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
        state.setSelectedIds([]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function screenToWorld(point: { x: number; y: number }) {
    return {
      x: (point.x - pan.x) / zoom,
      y: (point.y - pan.y) / zoom,
    };
  }

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

    const mousePointTo = {
      x: (pointer.x - store.pan.x) / oldScale,
      y: (pointer.y - store.pan.y) / oldScale,
    };

    store.setZoom(clamped);
    store.setPan({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    });
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage) return;

    const clickedOnEmpty = e.target === stage;
    if (!clickedOnEmpty) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const world = screenToWorld(pointer);

    setIsSelecting(true);
    setSelection({
      visible: true,
      x1: world.x,
      y1: world.y,
      x2: world.x,
      y2: world.y,
    });

    if (!e.evt.shiftKey) {
      setSelectedIds([]);
    }
  }

  function handleMouseMove() {
    if (!isSelecting) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const world = screenToWorld(pointer);

    setSelection((prev) => ({
      ...prev,
      x2: world.x,
      y2: world.y,
    }));
  }

  function handleMouseUp() {
    if (!isSelecting) return;

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

  const selectionBox = {
    x: Math.min(selection.x1, selection.x2),
    y: Math.min(selection.y1, selection.y2),
    width: Math.abs(selection.x2 - selection.x1),
    height: Math.abs(selection.y2 - selection.y1),
  };

  return (
    <div
      className="konva-wrap"
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

        const world = {
          x: (pointer.x - store.pan.x) / store.zoom,
          y: (pointer.y - store.pan.y) / store.zoom,
        };

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
        draggable={!isSelecting}
        onDragEnd={(e) => {
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
      >
        <Layer listening={false}>
          <Grid width={5000} height={3000} />
        </Layer>

        <Layer>
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

          {guides.map((guide, index) => (
            <Line
              key={`${guide.type}-${guide.position}-${index}`}
              points={
                guide.type === "vertical"
                  ? [guide.position, -5000, guide.position, 5000]
                  : [-5000, guide.position, 5000, guide.position]
              }
              stroke="#42c4c4"
              strokeWidth={1}
              dash={[6, 4]}
              listening={false}
            />
          ))}

          {selection.visible && (
            <Rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(66,196,196,0.14)"
              stroke="#42c4c4"
              strokeWidth={1}
            />
          )}

          <Transformer
            ref={transformerRef}
            rotateEnabled={!selectionHasGroup}
            enabledAnchors={[
              "top-left",
              "top-center",
              "top-right",
              "middle-left",
              "middle-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ]}
            anchorSize={8}
            anchorStroke="#42c4c4"
            anchorFill="#ffffff"
            borderStroke="#42c4c4"
            borderStrokeWidth={1.5}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            boundBoxFunc={(oldBox, newBox) => {
              if (selectionHasGroup) return oldBox;
              if (newBox.width < 10 || newBox.height < 10) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}

function Grid(props: { width: number; height: number }) {
  const lines = [];
  const step = 24;

  for (let i = -props.width; i < props.width; i += step) {
    lines.push(
      <Rect
        key={`v-${i}`}
        x={i}
        y={-props.height}
        width={1}
        height={props.height * 2}
        fill={i % 120 === 0 ? "#d2e2e2" : "#dceaea"}
        opacity={i % 120 === 0 ? 0.55 : 0.35}
      />,
    );
  }

  for (let j = -props.height; j < props.height; j += step) {
    lines.push(
      <Rect
        key={`h-${j}`}
        x={-props.width}
        y={j}
        width={props.width * 2}
        height={1}
        fill={j % 120 === 0 ? "#d2e2e2" : "#dceaea"}
        opacity={j % 120 === 0 ? 0.55 : 0.35}
      />,
    );
  }

  return <>{lines}</>;
}

function ElementNode(props: {
  element: CanvasElement;
  setGuides: (g: GuideLine[]) => void;
  onOpenCropEditor?: (imageId: string) => void;
}) {
  const { element } = props;

  if (!element.visible) return null;

  if (element.type === "image") {
    return (
      <ImageNode
        element={element}
        setGuides={props.setGuides}
        onOpenCropEditor={props.onOpenCropEditor}
      />
    );
  }
  if (element.type === "rect") {
    return <RectNode element={element} setGuides={props.setGuides} />;
  }
  if (element.type === "text") {
    return <TextNode element={element} setGuides={props.setGuides} />;
  }
  if (element.type === "arrow") {
    return <ArrowNode element={element} setGuides={props.setGuides} />;
  }
  if (element.type === "group") {
    return <GroupNode element={element} setGuides={props.setGuides} />;
  }

  return null;
}

function commonProps(element: CanvasElement, setGuides: (g: GuideLine[]) => void) {
  return {
    id: element.id,
    name: "editable-node",
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    opacity: element.opacity,
    draggable: !element.locked,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;

      const state = useEditorStore.getState();

      if (state.editingTextId) return;

      if (e.evt.shiftKey) {
        if (state.selectedIds.includes(element.id)) {
          state.setSelectedIds(
            state.selectedIds.filter((id) => id !== element.id),
          );
        } else {
          state.setSelectedIds([...state.selectedIds, element.id]);
        }
      } else {
        state.setSelectedIds([element.id]);
      }
    },
    onDragStart: () => {
      useEditorStore.getState().commitHistory();
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      const state = useEditorStore.getState();
      const pg = state.getActivePage();

      const moving = {
        ...element,
        x: e.target.x(),
        y: e.target.y(),
      };

      const snap = getSnap(
        moving,
        pg.elements.filter((el) => !state.selectedIds.includes(el.id)),
      );

      setGuides(snap.guides);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      setGuides([]);

      const state = useEditorStore.getState();
      const pg = state.getActivePage();

      const moving = {
        ...element,
        x: e.target.x(),
        y: e.target.y(),
      };

      const snap = getSnap(
        moving,
        pg.elements.filter((el) => !state.selectedIds.includes(el.id)),
      );

      e.target.position({
        x: snap.x,
        y: snap.y,
      });

      useEditorStore.getState().updateElement(
        element.id,
        {
          x: Math.round(snap.x),
          y: Math.round(snap.y),
        } as Partial<CanvasElement>,
        { history: false },
      );
    },
    onTransformStart: () => {
      useEditorStore.getState().commitHistory();
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      useEditorStore.getState().updateElement(
        element.id,
        {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(5, Math.round(element.width * scaleX)),
          height: Math.max(5, Math.round(element.height * scaleY)),
          rotation: Math.round(node.rotation()),
        } as Partial<CanvasElement>,
        { history: false },
      );
    },
  };
}

function RectNode(props: {
  element: Extract<CanvasElement, { type: "rect" }>;
  setGuides: (g: GuideLine[]) => void;
}) {
  const el = props.element;

  return (
    <Rect
      {...commonProps(el, props.setGuides)}
      fill={el.fill}
      cornerRadius={el.radius}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth || 0}
    />
  );
}

function TextNode(props: {
  element: TextElement;
  setGuides: (g: GuideLine[]) => void;
}) {
  const el = props.element;
  const { editingTextId, setEditingTextId, updateElement } = useEditorStore();

  if (editingTextId === el.id) {
    return (
      <Group {...commonProps(el, props.setGuides)} draggable={false}>
        <Rect
          x={0}
          y={0}
          width={el.width}
          height={el.height}
          fill="rgba(255,255,255,0.92)"
          stroke="#42c4c4"
          strokeWidth={2}
        />
        <Text
          x={8}
          y={8}
          width={el.width - 16}
          height={el.height - 16}
          text={el.text}
          fontSize={el.fontSize}
          fontFamily={el.fontFamily}
          fontStyle={el.fontWeight}
          fill={el.color}
          verticalAlign="middle"
        />
      </Group>
    );
  }

  return (
    <Text
      {...commonProps(el, props.setGuides)}
      text={el.text}
      fontSize={el.fontSize}
      fontFamily={el.fontFamily}
      fontStyle={el.fontWeight}
      fill={el.color}
      align={el.align}
      verticalAlign="middle"
      onDblClick={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (!stage) return;

        setEditingTextId(el.id);

        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);

        const stageBox = stage.container().getBoundingClientRect();
        const pos = e.target.absolutePosition();

        textarea.value = el.text;
        textarea.className = "konva-textarea";

        textarea.style.left = `${stageBox.left + pos.x}px`;
        textarea.style.top = `${stageBox.top + pos.y}px`;
        textarea.style.width = `${el.width * stage.scaleX()}px`;
        textarea.style.height = `${el.height * stage.scaleY()}px`;
        textarea.style.fontSize = `${el.fontSize * stage.scaleX()}px`;
        textarea.style.fontFamily = el.fontFamily;
        textarea.style.fontWeight = el.fontWeight;
        textarea.style.color = el.color;

        textarea.focus();
        textarea.select();

        function finish(save: boolean) {
          if (save) {
            updateElement(el.id, {
              text: textarea.value,
            } as Partial<CanvasElement>);
          }

          setEditingTextId(null);
          textarea.remove();
        }

        textarea.addEventListener("keydown", (ev) => {
          if (ev.key === "Escape") finish(false);
          if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) finish(true);
        });

        textarea.addEventListener("blur", () => finish(true));
      }}
    />
  );
}

function ArrowNode(props: {
  element: Extract<CanvasElement, { type: "arrow" }>;
  setGuides: (g: GuideLine[]) => void;
}) {
  const el = props.element;

  return (
    <Arrow
      {...commonProps(el, props.setGuides)}
      points={[0, el.height / 2, el.width, el.height / 2]}
      stroke={el.stroke}
      fill={el.stroke}
      strokeWidth={el.strokeWidth}
      pointerLength={18}
      pointerWidth={18}
    />
  );
}

function GroupChildPreview(props: { child: CanvasElement; group: CanvasElement }) {
  const dx = props.child.x - props.group.x;
  const dy = props.child.y - props.group.y;

  if (props.child.type === "rect") {
    const c = props.child;
    return (
      <Rect
        x={dx}
        y={dy}
        width={c.width}
        height={c.height}
        rotation={c.rotation}
        opacity={c.opacity}
        fill={c.fill}
        cornerRadius={c.radius}
        stroke={c.stroke}
        strokeWidth={c.strokeWidth || 0}
        listening={false}
      />
    );
  }

  if (props.child.type === "text") {
    const c = props.child;
    return (
      <Text
        x={dx}
        y={dy}
        width={c.width}
        height={c.height}
        rotation={c.rotation}
        opacity={c.opacity}
        text={c.text}
        fontSize={c.fontSize}
        fontFamily={c.fontFamily}
        fontStyle={c.fontWeight}
        fill={c.color}
        align={c.align}
        verticalAlign="middle"
        listening={false}
      />
    );
  }

  if (props.child.type === "arrow") {
    const c = props.child;
    return (
      <Arrow
        x={dx}
        y={dy}
        width={c.width}
        height={c.height}
        rotation={c.rotation}
        opacity={c.opacity}
        points={[0, c.height / 2, c.width, c.height / 2]}
        stroke={c.stroke}
        fill={c.stroke}
        strokeWidth={c.strokeWidth}
        pointerLength={18}
        pointerWidth={18}
        listening={false}
      />
    );
  }

  if (props.child.type === "image") {
    return (
      <GroupChildImage
        child={props.child}
        dx={dx}
        dy={dy}
        group={props.group}
      />
    );
  }

  return null;
}

function GroupChildImage(props: {
  child: ImageElement;
  dx: number;
  dy: number;
  group: CanvasElement;
}) {
  const img = useImage(props.child.src);
  const c = props.child;
  const baseScale = img
    ? Math.max(c.width / img.width, c.height / img.height)
    : 1;
  const finalScale = baseScale * (c.cropScale || 1);

  if (!img) {
    return (
      <Rect
        x={props.dx}
        y={props.dy}
        width={c.width}
        height={c.height}
        fill="#e5e7eb"
        listening={false}
      />
    );
  }

  return (
    <Group x={props.dx} y={props.dy} rotation={c.rotation}>
      <KonvaImage
        image={img}
        x={c.width / 2 + (c.cropOffsetX || 0)}
        y={c.height / 2 + (c.cropOffsetY || 0)}
        offsetX={img.width / 2}
        offsetY={img.height / 2}
        width={img.width}
        height={img.height}
        scaleX={finalScale * (c.flipX ? -1 : 1)}
        scaleY={finalScale * (c.flipY ? -1 : 1)}
        rotation={c.cropRotation || 0}
        opacity={c.opacity}
        listening={false}
      />
    </Group>
  );
}

function GroupNode(props: {
  element: Extract<CanvasElement, { type: "group" }>;
  setGuides: (g: GuideLine[]) => void;
}) {
  const g = props.element;
  const children = useEditorStore((st) => {
    const pg = st.pages.find((p) => p.id === st.activePageId);
    return pg?.elements.filter((c) => c.parentId === g.id) ?? [];
  });

  const { commitHistory } = useEditorStore();

  const selectedIds = useEditorStore((s) => s.selectedIds);

  return (
    <Group
      id={g.id}
      name="editable-node"
      x={g.x}
      y={g.y}
      width={g.width}
      height={g.height}
      rotation={g.rotation}
      opacity={g.opacity}
      draggable={!g.locked}
      onClick={(e) => {
        e.cancelBubble = true;
        const state = useEditorStore.getState();
        if (state.editingTextId) return;
        if (e.evt.shiftKey) {
          if (state.selectedIds.includes(g.id)) {
            state.setSelectedIds(state.selectedIds.filter((id) => id !== g.id));
          } else {
            state.setSelectedIds([...state.selectedIds, g.id]);
          }
        } else {
          state.setSelectedIds([g.id]);
        }
      }}
      onDragStart={() => {
        commitHistory();
      }}
      onDragMove={(e) => {
        const state = useEditorStore.getState();
        const pg = state.getActivePage();
        const moving = { ...g, x: e.target.x(), y: e.target.y() };
        const snap = getSnap(
          moving,
          pg.elements.filter((el) => !state.selectedIds.includes(el.id)),
        );
        props.setGuides(snap.guides);
      }}
      onDragEnd={(e) => {
        props.setGuides([]);
        const st = useEditorStore.getState();
        const cur = st.getActivePage().elements.find((x) => x.id === g.id);
        if (!cur || cur.type !== "group") return;

        const pg = st.getActivePage();
        const moving = { ...g, x: e.target.x(), y: e.target.y() };
        const snap = getSnap(
          moving,
          pg.elements.filter((el) => !st.selectedIds.includes(el.id)),
        );
        e.target.position({ x: snap.x, y: snap.y });

        const nx = Math.round(snap.x);
        const ny = Math.round(snap.y);
        const dx = nx - cur.x;
        const dy = ny - cur.y;
        st.updateElement(cur.id, { x: nx, y: ny } as Partial<CanvasElement>, {
          history: false,
        });
        const ch = st.getActivePage().elements.filter((c) => c.parentId === cur.id);
        for (const c of ch) {
          st.updateElement(
            c.id,
            { x: c.x + dx, y: c.y + dy } as Partial<CanvasElement>,
            { history: false },
          );
        }
      }}
    >
      <Rect
        x={0}
        y={0}
        width={g.width}
        height={g.height}
        fill="rgba(66,196,196,0.06)"
        stroke="#42c4c4"
        dash={[6, 4]}
        strokeWidth={1}
        listening={false}
      />
      {children.map((c) => (
        <GroupChildPreview key={c.id} child={c} group={g} />
      ))}
      {selectedIds.includes(g.id) && (
        <Rect
          x={0}
          y={0}
          width={g.width}
          height={g.height}
          stroke="#42c4c4"
          strokeWidth={1}
          listening={false}
        />
      )}
    </Group>
  );
}

function FilteredImage(props: {
  image: HTMLImageElement;
  element: ImageElement;
  finalScale: number;
}) {
  const imageRef = useRef<Konva.Image | null>(null);
  const { image, element, finalScale } = props;

  const filter = element.filter;

  useEffect(() => {
    const node = imageRef.current;
    if (!node) return;

    node.cache();
    node.getLayer()?.batchDraw();

    return () => {
      node.clearCache();
    };
  }, [
    image,
    filter.brightness,
    filter.contrast,
    filter.saturation,
    filter.blur,
    element.cropScale,
    element.cropRotation,
    element.flipX,
    element.flipY,
  ]);

  const filters: Filter[] = [];

  if (filter.brightness !== 0) filters.push(Konva.Filters.Brighten);
  if (filter.contrast !== 0) filters.push(Konva.Filters.Contrast);
  if (filter.saturation !== 0) filters.push(Konva.Filters.HSV);
  if (filter.blur !== 0) filters.push(Konva.Filters.Blur);

  return (
    <KonvaImage
      ref={imageRef}
      image={image}
      x={element.width / 2 + (element.cropOffsetX || 0)}
      y={element.height / 2 + (element.cropOffsetY || 0)}
      offsetX={image.width / 2}
      offsetY={image.height / 2}
      width={image.width}
      height={image.height}
      scaleX={finalScale * (element.flipX ? -1 : 1)}
      scaleY={finalScale * (element.flipY ? -1 : 1)}
      rotation={element.cropRotation || 0}
      listening={false}
      draggable={false}
      filters={filters}
      brightness={filter.brightness}
      contrast={filter.contrast}
      saturation={filter.saturation}
      blurRadius={filter.blur}
    />
  );
}

/** 主画布上叠加显示已保存的 AI 蒙版（与导出 inpaint 用的 raster 一致） */
function AIMaskOverlay(props: {
  mask: ImageMaskData;
  frameW: number;
  frameH: number;
}) {
  const [overlayImg, setOverlayImg] = useState<HTMLImageElement | null>(null);

  const maskKey = `${props.mask.width}x${props.mask.height}-${props.mask.strokes.map((s) => `${s.id}:${s.points.join(",")}`).join("|")}`;

  useEffect(() => {
    if (!props.mask.strokes.length) {
      setOverlayImg(null);
      return;
    }

    const url = exportMaskToDataURL(props.mask);
    if (!url) {
      setOverlayImg(null);
      return;
    }

    const image = new window.Image();
    image.onload = () => setOverlayImg(image);
    image.onerror = () => setOverlayImg(null);
    image.src = url;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [maskKey]);

  if (!overlayImg) return null;

  return (
    <KonvaImage
      image={overlayImg}
      x={0}
      y={0}
      width={props.frameW}
      height={props.frameH}
      opacity={0.55}
      listening={false}
    />
  );
}

function ImageNode(props: {
  element: ImageElement;
  setGuides: (g: GuideLine[]) => void;
  onOpenCropEditor?: (imageId: string) => void;
}) {
  const image = useImage(props.element.src);
  const element = props.element;

  const { selectedIds, setSelectedIds } = useEditorStore();

  const selected = selectedIds.includes(element.id);

  const baseScale = image
    ? Math.max(element.width / image.width, element.height / image.height)
    : 1;

  const finalScale = baseScale * (element.cropScale || 1);

  function clipShape(ctx: SceneContext) {
    ctx.beginPath();

    if (element.maskShape === "circle") {
      ctx.ellipse(
        element.width / 2,
        element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      return;
    }

    const radius =
      element.maskShape === "roundRect" ? element.cornerRadius || 0 : 0;

    if (radius <= 0) {
      ctx.rect(0, 0, element.width, element.height);
      return;
    }

    const r = Math.min(radius, element.width / 2, element.height / 2);
    ctx.moveTo(r, 0);
    ctx.lineTo(element.width - r, 0);
    ctx.quadraticCurveTo(element.width, 0, element.width, r);
    ctx.lineTo(element.width, element.height - r);
    ctx.quadraticCurveTo(
      element.width,
      element.height,
      element.width - r,
      element.height,
    );
    ctx.lineTo(r, element.height);
    ctx.quadraticCurveTo(0, element.height, 0, element.height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
  }

  return (
    <Group
      {...commonProps(element, props.setGuides)}
      draggable={!element.locked}
      clipFunc={clipShape}
      onClick={(e) => {
        e.cancelBubble = true;

        if (e.evt.shiftKey) {
          if (selectedIds.includes(element.id)) {
            setSelectedIds(selectedIds.filter((id) => id !== element.id));
          } else {
            setSelectedIds([...selectedIds, element.id]);
          }
        } else {
          setSelectedIds([element.id]);
        }
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        setSelectedIds([element.id]);
        props.onOpenCropEditor?.(element.id);
      }}
    >
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        fill="#e5e7eb"
        cornerRadius={
          element.maskShape === "roundRect" ? element.cornerRadius || 0 : 0
        }
        listening={false}
      />

      {image && (
        <FilteredImage
          image={image}
          element={element}
          finalScale={finalScale}
        />
      )}

      {element.aiMask && element.aiMask.strokes.length > 0 && (
        <AIMaskOverlay
          mask={element.aiMask}
          frameW={element.width}
          frameH={element.height}
        />
      )}

      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        fill="transparent"
        listening
      />

      {element.aiMask && (
        <Group x={8} y={8} listening={false}>
          <Rect
            width={78}
            height={24}
            fill="rgba(255,23,23,0.88)"
            cornerRadius={6}
          />
          <Text
            x={8}
            y={5}
            text="AI 蒙版"
            fontSize={12}
            fill="#ffffff"
          />
        </Group>
      )}

      {selected && (
        <Rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          stroke="#42c4c4"
          strokeWidth={1}
          cornerRadius={
            element.maskShape === "roundRect" ? element.cornerRadius || 0 : 0
          }
          listening={false}
        />
      )}
    </Group>
  );
}
