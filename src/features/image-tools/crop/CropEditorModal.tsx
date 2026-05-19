import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Group,
  Rect,
  Line,
  Circle,
  Image as KonvaImage,
} from "react-konva";
import Konva from "konva";
import type { SceneContext } from "konva/lib/Context";
import type { Filter } from "konva/lib/Node";
import { useCanvasImage } from "../../canvas/elements/useCanvasImage";
import { clone, useEditorStore } from "../../editor/store";
import type {
  CanvasElement,
  ImageElement,
  ImageMaskShape,
} from "../../editor/types";

function cropClipShape(el: ImageElement, ctx: SceneContext) {
  ctx.beginPath();

  if (el.maskShape === "circle") {
    ctx.ellipse(
      el.width / 2,
      el.height / 2,
      el.width / 2,
      el.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    return;
  }

  const radius =
    el.maskShape === "roundRect" ? el.cornerRadius || 0 : 0;

  if (radius <= 0) {
    ctx.rect(0, 0, el.width, el.height);
    return;
  }

  const r = Math.min(radius, el.width / 2, el.height / 2);
  ctx.moveTo(r, 0);
  ctx.lineTo(el.width - r, 0);
  ctx.quadraticCurveTo(el.width, 0, el.width, r);
  ctx.lineTo(el.width, el.height - r);
  ctx.quadraticCurveTo(el.width, el.height, el.width - r, el.height);
  ctx.lineTo(r, el.height);
  ctx.quadraticCurveTo(0, el.height, 0, el.height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
}

function CropModalFilteredImage(props: {
  image: HTMLImageElement;
  element: ImageElement;
  onPatch: (patch: Partial<ImageElement>) => void;
}) {
  const imageRef = useRef<Konva.Image | null>(null);
  const { element: element } = props;
  const filter = element.filter;

  const filters: Filter[] = [];

  if (filter.brightness !== 0) filters.push(Konva.Filters.Brighten);
  if (filter.contrast !== 0) filters.push(Konva.Filters.Contrast);
  if (filter.saturation !== 0) filters.push(Konva.Filters.HSV);
  if (filter.blur !== 0) filters.push(Konva.Filters.Blur);

  const hasFilters = filters.length > 0;

  useEffect(() => {
    const node = imageRef.current;
    if (!node || !hasFilters) return;

    try {
      node.cache();
      node.getLayer()?.batchDraw();
    } catch {
      node.clearCache();
      node.filters([]);
    }

    return () => {
      node.clearCache();
    };
  }, [
    props.image,
    hasFilters,
    filter.brightness,
    filter.contrast,
    filter.saturation,
    filter.blur,
    element.cropScale,
    element.cropRotation,
    element.flipX,
    element.flipY,
  ]);

  const baseScale =
    props.image.width > 0 && props.image.height > 0
      ? Math.max(element.width / props.image.width, element.height / props.image.height)
      : 1;
  const finalScale = baseScale * (element.cropScale || 1);

  return (
    <KonvaImage
      ref={imageRef}
      image={props.image}
      x={element.width / 2 + (element.cropOffsetX || 0)}
      y={element.height / 2 + (element.cropOffsetY || 0)}
      offsetX={props.image.width / 2}
      offsetY={props.image.height / 2}
      width={props.image.width}
      height={props.image.height}
      scaleX={finalScale * (element.flipX ? -1 : 1)}
      scaleY={finalScale * (element.flipY ? -1 : 1)}
      rotation={element.cropRotation || 0}
      draggable
      filters={hasFilters ? filters : undefined}
      brightness={hasFilters ? filter.brightness : undefined}
      contrast={hasFilters ? filter.contrast : undefined}
      saturation={hasFilters ? filter.saturation : undefined}
      blurRadius={hasFilters ? filter.blur : undefined}
      onDragMove={(e) => {
        props.onPatch({
          cropOffsetX: Math.round(e.target.x() - element.width / 2),
          cropOffsetY: Math.round(e.target.y() - element.height / 2),
        });
      }}
      onDragEnd={(e) => {
        props.onPatch({
          cropOffsetX: Math.round(e.target.x() - element.width / 2),
          cropOffsetY: Math.round(e.target.y() - element.height / 2),
        });
      }}
    />
  );
}

function CropModalEdgeHandles(props: {
  element: ImageElement;
  onPatch: (patch: Partial<ImageElement>) => void;
}) {
  const { element } = props;
  const size = 10;

  function updateCropFrame(edge: "left" | "right" | "top" | "bottom", node: Konva.Node) {
    const dx = node.x();
    const dy = node.y();

    let nextX = element.x;
    let nextY = element.y;
    let nextW = element.width;
    let nextH = element.height;
    let nextCropOffsetX = element.cropOffsetX || 0;
    let nextCropOffsetY = element.cropOffsetY || 0;

    if (edge === "left") {
      nextX = element.x + dx;
      nextW = element.width - dx;
      nextCropOffsetX = (element.cropOffsetX || 0) - dx / 2;
    }

    if (edge === "right") {
      nextW = element.width + dx;
      nextCropOffsetX = (element.cropOffsetX || 0) - dx / 2;
    }

    if (edge === "top") {
      nextY = element.y + dy;
      nextH = element.height - dy;
      nextCropOffsetY = (element.cropOffsetY || 0) - dy / 2;
    }

    if (edge === "bottom") {
      nextH = element.height + dy;
      nextCropOffsetY = (element.cropOffsetY || 0) - dy / 2;
    }

    nextW = Math.max(40, nextW);
    nextH = Math.max(40, nextH);

    props.onPatch({
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: Math.round(nextW),
      height: Math.round(nextH),
      cropOffsetX: Math.round(nextCropOffsetX),
      cropOffsetY: Math.round(nextCropOffsetY),
    });

    node.position({ x: 0, y: 0 });
  }

  return (
    <>
      <Rect
        x={-size / 2}
        y={0}
        width={size}
        height={element.height}
        fill="transparent"
        draggable
        cursor="ew-resize"
        onDragMove={(e) => updateCropFrame("left", e.target)}
        onDragEnd={(e) => updateCropFrame("left", e.target)}
      />

      <Rect
        x={element.width - size / 2}
        y={0}
        width={size}
        height={element.height}
        fill="transparent"
        draggable
        cursor="ew-resize"
        onDragMove={(e) => updateCropFrame("right", e.target)}
        onDragEnd={(e) => updateCropFrame("right", e.target)}
      />

      <Rect
        x={0}
        y={-size / 2}
        width={element.width}
        height={size}
        fill="transparent"
        draggable
        cursor="ns-resize"
        onDragMove={(e) => updateCropFrame("top", e.target)}
        onDragEnd={(e) => updateCropFrame("top", e.target)}
      />

      <Rect
        x={0}
        y={element.height - size / 2}
        width={element.width}
        height={size}
        fill="transparent"
        draggable
        cursor="ns-resize"
        onDragMove={(e) => updateCropFrame("bottom", e.target)}
        onDragEnd={(e) => updateCropFrame("bottom", e.target)}
      />

      <Rect x={-4} y={element.height / 2 - 22} width={8} height={44} fill="#ffffff" stroke="#42c4c4" cornerRadius={4} listening={false} />
      <Rect x={element.width - 4} y={element.height / 2 - 22} width={8} height={44} fill="#ffffff" stroke="#42c4c4" cornerRadius={4} listening={false} />
      <Rect x={element.width / 2 - 22} y={-4} width={44} height={8} fill="#ffffff" stroke="#42c4c4" cornerRadius={4} listening={false} />
      <Rect x={element.width / 2 - 22} y={element.height - 4} width={44} height={8} fill="#ffffff" stroke="#42c4c4" cornerRadius={4} listening={false} />
    </>
  );
}

type Props = {
  imageId: string | null;
  open: boolean;
  onClose: () => void;
};

export function CropEditorModal({ imageId, open, onClose }: Props) {
  const { updateElement, getActivePage } = useEditorStore();
  const page = getActivePage();

  const sourceEl = useMemo(() => {
    return page.elements.find((el) => el.id === imageId && el.type === "image") as
      | ImageElement
      | undefined;
  }, [page.elements, imageId]);

  const [draft, setDraft] = useState<ImageElement | null>(null);

  useEffect(() => {
    if (!open || !imageId || !sourceEl) {
      setDraft(null);
      return;
    }

    const el = useEditorStore
      .getState()
      .getActivePage()
      .elements.find((e) => e.id === imageId && e.type === "image") as
      | ImageElement
      | undefined;

    if (el) setDraft(clone(el));
  }, [open, imageId, sourceEl]);

  const { image: imgLoaded } = useCanvasImage(sourceEl?.src);

  const draftRef = useRef<ImageElement | null>(null);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const patchDraft = useCallback((patch: Partial<ImageElement>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : null));
  }, []);

  const editorW = Math.min(window.innerWidth - 340, 1100);
  const editorH = Math.min(window.innerHeight - 120, 820);

  const frame = useMemo(() => {
    if (!draft) {
      return { offsetX: 0, offsetY: 0, scale: 1 };
    }

    const maxW = editorW - 48;
    const maxH = editorH - 48;
    const scale = Math.min(maxW / draft.width, maxH / draft.height, 2);

    const w = draft.width * scale;
    const h = draft.height * scale;

    return {
      offsetX: (editorW - w) / 2,
      offsetY: (editorH - h) / 2,
      scale,
    };
  }, [draft, editorW, editorH]);

  const applyCrop = useCallback(() => {
    const d = draftRef.current;
    if (!d) return;

    const exists = useEditorStore
      .getState()
      .getActivePage()
      .elements.some((el) => el.id === d.id);

    if (!exists) {
      onClose();
      return;
    }

    updateElement(d.id, {
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      cropOffsetX: d.cropOffsetX,
      cropOffsetY: d.cropOffsetY,
      cropScale: d.cropScale,
      cropRotation: d.cropRotation,
      flipX: d.flipX,
      flipY: d.flipY,
      cornerRadius: d.cornerRadius,
      maskShape: d.maskShape,
    } as Partial<CanvasElement>);
    onClose();
  }, [updateElement, onClose]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        applyCrop();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, applyCrop]);

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    if (!draft) return;
    if (e.evt.ctrlKey || e.evt.metaKey) return;

    const delta = e.evt.deltaY > 0 ? -0.05 : 0.05;
    const nextScale = Math.min(
      5,
      Math.max(0.2, (draft.cropScale || 1) + delta),
    );

    setDraft((d) =>
      d ? { ...d, cropScale: Number(nextScale.toFixed(2)) } : null,
    );
  }

  if (!open || !sourceEl || !draft) return null;

  return (
    <div className="mask-modal">
      <div className="mask-editor">
        <div className="mask-topbar">
          <strong>裁剪编辑器</strong>
          <span className="mask-divider" />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            拖动图片平移 · 边柄调外框 · 滚轮缩放（与主画布原逻辑一致）
          </span>
          <button type="button" className="save" onClick={applyCrop}>
            ✓ 完成
          </button>
          <button
            type="button"
            className="cancel"
            onClick={() => onClose()}
          >
            × 取消
          </button>
          <button
            type="button"
            className="close"
            onClick={() => onClose()}
          >
            ×
          </button>
        </div>

        <div className="mask-body">
          <div className="mask-canvas-wrap">
            <Stage width={editorW} height={editorH} onWheel={handleWheel}>
              <Layer>
                <Rect x={0} y={0} width={editorW} height={editorH} fill="#15161a" />

                <Group
                  x={frame.offsetX}
                  y={frame.offsetY}
                  scaleX={frame.scale}
                  scaleY={frame.scale}
                >
                  <Group clipFunc={(ctx: SceneContext) => cropClipShape(draft, ctx)}>
                    <Rect
                      x={0}
                      y={0}
                      width={draft.width}
                      height={draft.height}
                      fill="#e5e7eb"
                      cornerRadius={
                        draft.maskShape === "roundRect" ? draft.cornerRadius || 0 : 0
                      }
                      listening={false}
                    />

                    {imgLoaded && (
                      <CropModalFilteredImage
                        image={imgLoaded}
                        element={draft}
                        onPatch={patchDraft}
                      />
                    )}

                    <Rect
                      x={0}
                      y={0}
                      width={draft.width}
                      height={draft.height}
                      fill="rgba(0,0,0,0.08)"
                      listening={false}
                    />

                    <Line points={[draft.width / 3, 0, draft.width / 3, draft.height]} stroke="rgba(255,255,255,0.95)" strokeWidth={1} dash={[4, 4]} listening={false} />
                    <Line
                      points={[(draft.width / 3) * 2, 0, (draft.width / 3) * 2, draft.height]}
                      stroke="rgba(255,255,255,0.95)"
                      strokeWidth={1}
                      dash={[4, 4]}
                      listening={false}
                    />
                    <Line points={[0, draft.height / 3, draft.width, draft.height / 3]} stroke="rgba(255,255,255,0.95)" strokeWidth={1} dash={[4, 4]} listening={false} />
                    <Line
                      points={[0, (draft.height / 3) * 2, draft.width, (draft.height / 3) * 2]}
                      stroke="rgba(255,255,255,0.95)"
                      strokeWidth={1}
                      dash={[4, 4]}
                      listening={false}
                    />

                    <Rect
                      x={0}
                      y={0}
                      width={draft.width}
                      height={draft.height}
                      stroke="#42c4c4"
                      strokeWidth={2}
                      cornerRadius={
                        draft.maskShape === "roundRect" ? draft.cornerRadius || 0 : 0
                      }
                      listening={false}
                    />

                    {draft.maskShape === "circle" && (
                      <Circle
                        x={draft.width / 2}
                        y={draft.height / 2}
                        radius={Math.min(draft.width, draft.height) / 2}
                        stroke="#42c4c4"
                        strokeWidth={2}
                        listening={false}
                      />
                    )}

                    <CropModalEdgeHandles element={draft} onPatch={patchDraft} />
                  </Group>
                </Group>
              </Layer>
            </Stage>
          </div>

          <div className="mask-panel">
            <h3>裁剪与蒙版</h3>

            <div className="crop-toolbar">
              <button
                type="button"
                onClick={() =>
                  patchDraft({
                    cropOffsetX: 0,
                    cropOffsetY: 0,
                    cropScale: 1,
                    cropRotation: 0,
                    flipX: false,
                    flipY: false,
                  })
                }
              >
                重置
              </button>
              <button
                type="button"
                onClick={() =>
                  patchDraft({
                    cropScale: 1,
                    cropOffsetX: 0,
                    cropOffsetY: 0,
                  })
                }
              >
                填充
              </button>
              <button
                type="button"
                onClick={() =>
                  patchDraft({
                    cropScale: 0.8,
                    cropOffsetX: 0,
                    cropOffsetY: 0,
                  })
                }
              >
                适应
              </button>
            </div>

            <div className="crop-toolbar two">
              <button
                type="button"
                onClick={() => patchDraft({ flipX: !draft.flipX })}
              >
                水平翻转
              </button>
              <button
                type="button"
                onClick={() => patchDraft({ flipY: !draft.flipY })}
              >
                垂直翻转
              </button>
            </div>

            <label className="mask-field">
              <span>图片 X（cropOffsetX）</span>
              <input
                type="number"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={draft.cropOffsetX || 0}
                onChange={(e) =>
                  patchDraft({ cropOffsetX: Number(e.target.value) })
                }
              />
            </label>

            <label className="mask-field">
              <span>图片 Y（cropOffsetY）</span>
              <input
                type="number"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={draft.cropOffsetY || 0}
                onChange={(e) =>
                  patchDraft({ cropOffsetY: Number(e.target.value) })
                }
              />
            </label>

            <label className="mask-field">
              <span>缩放 cropScale</span>
              <input
                type="range"
                min={0.2}
                max={5}
                step={0.01}
                style={{ width: "100%" }}
                value={draft.cropScale || 1}
                onChange={(e) =>
                  patchDraft({ cropScale: Number(e.target.value) })
                }
              />
            </label>

            <label className="mask-field">
              <span>旋转 cropRotation</span>
              <input
                type="range"
                min={-180}
                max={180}
                style={{ width: "100%" }}
                value={draft.cropRotation || 0}
                onChange={(e) =>
                  patchDraft({ cropRotation: Number(e.target.value) })
                }
              />
            </label>

            <label className="mask-field">
              <span>圆角</span>
              <input
                type="range"
                min={0}
                max={160}
                style={{ width: "100%" }}
                value={draft.cornerRadius || 0}
                onChange={(e) =>
                  patchDraft({
                    cornerRadius: Number(e.target.value),
                    maskShape: "roundRect",
                  })
                }
              />
            </label>

            <label className="mask-field">
              <span>蒙版形状</span>
              <select
                style={{ width: "100%", height: 34 }}
                value={draft.maskShape || "rect"}
                onChange={(e) =>
                  patchDraft({ maskShape: e.target.value as ImageMaskShape })
                }
              >
                <option value="rect">矩形</option>
                <option value="roundRect">圆角矩形</option>
                <option value="circle">圆形</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
