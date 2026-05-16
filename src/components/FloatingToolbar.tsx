import type { MutableRefObject } from "react";
import { memo, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Stage } from "konva/lib/Stage";
import {
  getToolById,
  type QuickTool,
  type QuickToolId,
} from "../editor/quickTools";
import { executeElementCommand } from "../editor/commands/executeElementCommand";
import { useEditorStore } from "../editor/store";
import type { CanvasElement } from "../editor/types";

/** 与 StageCanvas `screenToWorld` 互逆 */
const TOOLBAR_GAP = 10;

function worldToStageClient(
  wx: number,
  wy: number,
  zoom: number,
  pan: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: wx * zoom + pan.x,
    y: wy * zoom + pan.y,
  };
}

/** 与 Konva Group 一致：先 translate(x,y) 再 rotate，绕本地 (0,0) 即元素左上角，非矩形中心 */
function worldAabb(el: CanvasElement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const { x, y, width: w, height: h, rotation } = el;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners: { x: number; y: number }[] = [
    { lx: 0, ly: 0 },
    { lx: w, ly: 0 },
    { lx: w, ly: h },
    { lx: 0, ly: h },
  ].map(({ lx, ly }) => ({
    x: x + lx * cos - ly * sin,
    y: y + lx * sin + ly * cos,
  }));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of corners) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function unionWorldAabb(
  els: CanvasElement[],
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!els.length) return null;
  let u = worldAabb(els[0]!);
  for (let i = 1; i < els.length; i++) {
    const b = worldAabb(els[i]!);
    u = {
      minX: Math.min(u.minX, b.minX),
      minY: Math.min(u.minY, b.minY),
      maxX: Math.max(u.maxX, b.maxX),
      maxY: Math.max(u.maxY, b.maxY),
    };
  }
  return u;
}

/** 视口 CSS 像素：锚点为选中包络顶边中点略上方（由 CSS translate(-50%,-100%) 再整体上移） */
function toolbarAnchorViewport(
  stage: Stage,
  els: CanvasElement[],
  zoom: number,
  pan: { x: number; y: number },
): { left: number; top: number } | null {
  const b = unionWorldAabb(els);
  if (!b) return null;
  const cr = stage.container().getBoundingClientRect();
  const centerW = (b.minX + b.maxX) / 2;
  const topW = b.minY;
  const sc = worldToStageClient(centerW, topW, zoom, pan);
  return {
    left: cr.left + sc.x,
    top: cr.top + sc.y - TOOLBAR_GAP,
  };
}

type Props = {
  stageRef: MutableRefObject<Stage | null>;
  onCrop: (id: string) => void;
  onMask: (id: string) => void;
  onParse3d: (id: string) => void;
  onOpenAI: (opts: { imageId: string; mode: "replace-selected" | "new-layer" }) => void;
  onConnect: () => void;
  onReplaceImage: (imageId: string) => void;
  onOpenLibrary: () => void;
};

function toolVisible(
  tool: QuickTool,
  n: number,
  types: CanvasElement["type"][],
): boolean {
  if (n >= 2) {
    return tool.id === "group" || tool.id === "copy" || tool.id === "delete";
  }
  if (n === 1) {
    const t = types[0]!;
    if (tool.id === "ungroup") return t === "group";
    if (tool.id === "group") return false;
    return tool.elementTypes.includes(t);
  }
  return false;
}

export const FloatingToolbar = memo(function FloatingToolbar(props: Props) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const editingTextId = useEditorStore((s) => s.editingTextId);
  const marqueeSelecting = useEditorStore((s) => s.marqueeSelecting);
  const suppressed = useEditorStore((s) => s.floatingToolbarSuppressed);
  const quickToolbarConfig = useEditorStore((s) => s.quickToolbarConfig);
  const zoom = useEditorStore((s) => s.zoom);
  const pan = useEditorStore((s) => s.pan);
  const getActivePage = useEditorStore((s) => s.getActivePage);
  const layoutSignature = useEditorStore((s) => {
    const pg = s.pages.find((p) => p.id === s.activePageId);
    if (!pg) return "";
    return s.selectedIds
      .map((id) => {
        const el = pg.elements.find((e) => e.id === id);
        if (!el) return "";
        return `${id}:${el.x.toFixed(0)},${el.y.toFixed(0)},${el.width.toFixed(0)},${el.height.toFixed(0)},${el.rotation.toFixed(0)}`;
      })
      .join("|");
  });

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const page = getActivePage();
  const selectedEls = page.elements.filter((el) =>
    selectedIds.includes(el.id),
  );
  const n = selectedEls.length;
  const types = selectedEls.map((e) => e.type);
  const allVisible = selectedEls.every((e) => e.visible);

  const scope = n >= 2 ? "multi" : n === 1 ? selectedEls[0]!.type : null;
  const configIds = scope ? quickToolbarConfig[scope] : [];

  const tools = configIds
    .map(getToolById)
    .filter((t): t is QuickTool => !!t && toolVisible(t, n, types));

  useLayoutEffect(() => {
    if (
      !tools.length ||
      editingTextId ||
      marqueeSelecting ||
      suppressed ||
      !allVisible
    ) {
      setPos(null);
      return;
    }

    const stage = props.stageRef.current;
    if (!stage) {
      setPos(null);
      return;
    }

    let raf = 0;
    let raf2 = 0;

    function measure() {
      const st = props.stageRef.current;
      if (!st) {
        setPos(null);
        return;
      }
      const state = useEditorStore.getState();
      const els = state.getSelectedElements();
      if (!els.length) {
        setPos(null);
        return;
      }
      const p = toolbarAnchorViewport(st, els, state.zoom, state.pan);
      setPos(p);
    }

    /** 等 Konva Transformer / 节点布局一帧后再量，避免 getClientRect 仍为 0 */
    function measureDeferred() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
      raf = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(measure);
      });
    }

    measureDeferred();
    const ro = new ResizeObserver(measureDeferred);
    ro.observe(stage.container());

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [
    tools.length,
    selectedIds,
    editingTextId,
    marqueeSelecting,
    suppressed,
    allVisible,
    props.stageRef,
    layoutSignature,
    zoom,
    pan.x,
    pan.y,
  ]);

  if (
    !tools.length ||
    editingTextId ||
    marqueeSelecting ||
    suppressed ||
    !allVisible ||
    !pos
  ) {
    return null;
  }

  function runTool(id: QuickToolId) {
    if (n >= 2) {
      if (id === "group") executeElementCommand({ type: "groupSelected" });
      if (id === "copy") executeElementCommand({ type: "copy" });
      if (id === "delete") executeElementCommand({ type: "removeSelected" });
      return;
    }

    const el = selectedEls[0];
    if (!el) return;

    if (id === "crop" && el.type === "image") props.onCrop(el.id);
    if (id === "mask" && el.type === "image") props.onMask(el.id);
    if (id === "parse3d" && el.type === "image") props.onParse3d(el.id);
    if (id === "ai-edit" && el.type === "image") {
      props.onOpenAI({ imageId: el.id, mode: "replace-selected" });
    }
    if (id === "generate-node" && el.type === "image") {
      props.onOpenAI({ imageId: el.id, mode: "new-layer" });
    }
    if (id === "connect") props.onConnect();
    if (id === "replace-image" && el.type === "image") {
      props.onReplaceImage(el.id);
    }
    if (id === "save-library" && el.type === "image") props.onOpenLibrary();

    if (id === "copy") executeElementCommand({ type: "copy" });
    if (id === "delete") executeElementCommand({ type: "removeSelected" });
    if (id === "lock") {
      executeElementCommand({ type: "toggleLock", id: el.id });
    }
    if (id === "bring-front") executeElementCommand({ type: "bringToFront", id: el.id });
    if (id === "send-back") executeElementCommand({ type: "sendToBack", id: el.id });
    if (id === "ungroup" && el.type === "group") {
      executeElementCommand({ type: "ungroupSelected" });
    }
  }

  const bar = (
    <div
      className="floating-toolbar"
      style={{
        left: pos.left,
        top: pos.top,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="快捷工具条"
    >
      {tools.map((tool, i) => (
        <button
          key={tool.id}
          type="button"
          className={
            i === 0
              ? "floating-toolbar__btn floating-toolbar__btn--lead"
              : "floating-toolbar__btn"
          }
          title={tool.label}
          aria-label={tool.label}
          onClick={() => runTool(tool.id)}
        >
          <span aria-hidden>{tool.icon}</span>
        </button>
      ))}
    </div>
  );

  return createPortal(bar, document.body);
});
