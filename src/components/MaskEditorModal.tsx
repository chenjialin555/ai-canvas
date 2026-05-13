import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Line,
  Rect,
  Circle,
} from "react-konva";
import type Konva from "konva";
import { nanoid } from "nanoid";
import { useEditorStore } from "../editor/store";
import type { ImageElement, ImageMaskData, MaskStroke, MaskTool } from "../editor/types";

function useImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = src;
  }, [src]);

  return img;
}

type Props = {
  imageId: string | null;
  open: boolean;
  onClose: () => void;
};

export function MaskEditorModal(props: Props) {
  const { getActivePage, setImageAIMask } = useEditorStore();

  const page = getActivePage();

  const imageElement = useMemo(() => {
    return page.elements.find((el) => el.id === props.imageId && el.type === "image") as
      | ImageElement
      | undefined;
  }, [page.elements, props.imageId]);

  const image = useImage(imageElement?.src);

  const stageRef = useRef<Konva.Stage | null>(null);
  const isDrawing = useRef(false);

  const [tool, setTool] = useState<MaskTool>("brush");
  const [color, setColor] = useState("#ff1717");
  const [size, setSize] = useState(36);
  const [opacity, setOpacity] = useState(0.7);
  const [hardness, setHardness] = useState(1);
  const [spacing, setSpacing] = useState(10);
  const [shape, setShape] = useState<"circle" | "square">("circle");

  const [strokes, setStrokes] = useState<MaskStroke[]>([]);
  const [redoStack, setRedoStack] = useState<MaskStroke[]>([]);

  useEffect(() => {
    if (!props.open || !props.imageId) return;

    const el = useEditorStore
      .getState()
      .getActivePage()
      .elements.find((e) => e.id === props.imageId && e.type === "image") as
      | ImageElement
      | undefined;

    if (!el) return;

    if (el.aiMask) {
      setStrokes(el.aiMask.strokes || []);
    } else {
      setStrokes([]);
    }

    setRedoStack([]);
    setTool("brush");
  }, [props.open, props.imageId]);

  const editorW = Math.min(window.innerWidth - 420, 920);
  const editorH = Math.min(window.innerHeight - 120, 720);

  const frame = useMemo(() => {
    if (!imageElement) {
      return {
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        scale: 1,
      };
    }

    const maxW = editorW;
    const maxH = editorH;

    const scale = Math.min(maxW / imageElement.width, maxH / imageElement.height);

    const width = imageElement.width * scale;
    const height = imageElement.height * scale;

    return {
      x: (editorW - width) / 2,
      y: (editorH - height) / 2,
      width,
      height,
      scale,
    };
  }, [editorW, editorH, imageElement]);

  if (!props.open || !imageElement) return null;

  const imgEl = imageElement;

  function getPointerInImage() {
    const stage = stageRef.current;
    if (!stage) return null;

    const point = stage.getPointerPosition();
    if (!point) return null;

    const x = (point.x - frame.x) / frame.scale;
    const y = (point.y - frame.y) / frame.scale;

    if (
      x < 0 ||
      y < 0 ||
      x > imgEl.width ||
      y > imgEl.height
    ) {
      return null;
    }

    return { x, y };
  }

  function handleMouseDown() {
    const point = getPointerInImage();
    if (!point) return;

    isDrawing.current = true;

    const stroke: MaskStroke = {
      id: nanoid(),
      tool,
      points: [point.x, point.y],
      color,
      size,
      opacity,
      hardness,
    };

    setStrokes((prev) => [...prev, stroke]);
    setRedoStack([]);
  }

  function handleMouseMove() {
    if (!isDrawing.current) return;

    const point = getPointerInImage();
    if (!point) return;

    setStrokes((prev) => {
      const list = [...prev];
      const last = list[list.length - 1];

      if (!last) return prev;

      const nextLast = {
        ...last,
        points: [...last.points, point.x, point.y],
      };

      list[list.length - 1] = nextLast;

      return list;
    });
  }

  function handleMouseUp() {
    isDrawing.current = false;
  }

  function undo() {
    setStrokes((prev) => {
      if (!prev.length) return prev;

      const next = [...prev];
      const last = next.pop()!;

      setRedoStack((r) => [...r, last]);

      return next;
    });
  }

  function redo() {
    setRedoStack((prev) => {
      if (!prev.length) return prev;

      const nextRedo = [...prev];
      const item = nextRedo.pop()!;

      setStrokes((s) => [...s, item]);

      return nextRedo;
    });
  }

  function clear() {
    setStrokes([]);
    setRedoStack([]);
  }

  function save() {
    const mask: ImageMaskData = {
      version: "1.0.0",
      width: imgEl.width,
      height: imgEl.height,
      strokes,
    };

    setImageAIMask(imgEl.id, mask);
    props.onClose();
  }

  function cancel() {
    props.onClose();
  }

  return (
    <div className="mask-modal">
      <div className="mask-editor">
        <div className="mask-topbar">
          <strong>遮罩编辑器</strong>

          <button type="button" onClick={undo}>
            ↶
          </button>
          <button type="button" onClick={redo}>
            ↷
          </button>

          <span className="mask-divider" />

          <button
            type="button"
            className={tool === "brush" ? "active" : ""}
            onClick={() => setTool("brush")}
          >
            画笔
          </button>

          <button
            type="button"
            className={tool === "eraser" ? "active" : ""}
            onClick={() => setTool("eraser")}
          >
            橡皮
          </button>

          <button
            type="button"
            onClick={() => setShape(shape === "circle" ? "square" : "circle")}
          >
            {shape === "circle" ? "圆形" : "方形"}
          </button>

          <button type="button" onClick={clear}>
            清除
          </button>

          <button type="button" className="save" onClick={save}>
            ✓ 保存
          </button>

          <button type="button" className="cancel" onClick={cancel}>
            × 取消
          </button>

          <button type="button" className="close" onClick={cancel}>
            ×
          </button>
        </div>

        <div className="mask-body">
          <div className="mask-tools">
            <button
              type="button"
              className={tool === "brush" ? "selected" : ""}
              onClick={() => setTool("brush")}
              title="画笔"
            >
              ●
            </button>
            <button
              type="button"
              className={tool === "eraser" ? "selected" : ""}
              onClick={() => setTool("eraser")}
              title="橡皮"
            >
              ◆
            </button>
            <button type="button" title="吸管">
              ⌁
            </button>
          </div>

          <div className="mask-canvas-wrap">
            <Stage
              ref={stageRef}
              width={editorW}
              height={editorH}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <Layer>
                <Rect x={0} y={0} width={editorW} height={editorH} fill="#15161a" />

                {image && (
                  <KonvaImage
                    image={image}
                    x={frame.x}
                    y={frame.y}
                    width={frame.width}
                    height={frame.height}
                    listening={false}
                  />
                )}

                <Rect
                  x={frame.x}
                  y={frame.y}
                  width={frame.width}
                  height={frame.height}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={1}
                  listening={false}
                />

                {strokes.map((stroke) => (
                  <Line
                    key={stroke.id}
                    x={frame.x}
                    y={frame.y}
                    points={stroke.points.map((p) => p * frame.scale)}
                    stroke={
                      stroke.tool === "brush" ? stroke.color : "rgba(0,0,0,1)"
                    }
                    strokeWidth={stroke.size * frame.scale}
                    opacity={stroke.opacity}
                    lineCap={shape === "circle" ? "round" : "butt"}
                    lineJoin={shape === "circle" ? "round" : "miter"}
                    globalCompositeOperation={
                      stroke.tool === "eraser" ? "destination-out" : "source-over"
                    }
                    listening={false}
                  />
                ))}

                <BrushCursor
                  stageRef={stageRef}
                  frame={frame}
                  size={size}
                  color={tool === "brush" ? color : "#ffffff"}
                  tool={tool}
                />
              </Layer>
            </Stage>
          </div>

          <div className="mask-panel">
            <h3>笔刷设置</h3>

            <button
              type="button"
              className="reset-btn"
              onClick={() => {
                setSize(36);
                setOpacity(0.7);
                setHardness(1);
                setSpacing(10);
                setColor("#ff1717");
              }}
            >
              重置为默认
            </button>

            <div className="brush-shapes">
              <button
                type="button"
                className={shape === "circle" ? "active" : ""}
                onClick={() => setShape("circle")}
              >
                <span className="shape-circle" />
              </button>
              <button
                type="button"
                className={shape === "square" ? "active" : ""}
                onClick={() => setShape("square")}
              >
                <span className="shape-square" />
              </button>
            </div>

            <label className="mask-field">
              <span>色彩选取</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>

            <MaskSlider
              label="厚度"
              value={size}
              min={1}
              max={160}
              step={1}
              onChange={setSize}
            />

            <MaskSlider
              label="不透明度"
              value={opacity}
              min={0.05}
              max={1}
              step={0.01}
              onChange={setOpacity}
            />

            <MaskSlider
              label="硬度"
              value={hardness}
              min={0}
              max={1}
              step={0.01}
              onChange={setHardness}
            />

            <MaskSlider
              label="间距"
              value={spacing}
              min={1}
              max={100}
              step={1}
              onChange={setSpacing}
            />

            <div className="mask-layer-block">
              <h3>图层</h3>
              <MaskSlider
                label="遮罩不透明度"
                value={opacity}
                min={0.05}
                max={1}
                step={0.01}
                onChange={setOpacity}
              />
            </div>

            <div className="mask-help">
              <p>画笔：绘制 AI 编辑区域</p>
              <p>橡皮：擦除已绘制区域</p>
              <p>保存后，AI 生图会携带 mask PNG</p>
            </div>
          </div>
        </div>

        <div className="mask-status">
          <span>{Math.round(frame.scale * 100)}%</span>
          <span>
            {Math.round(imgEl.width)}×{Math.round(imgEl.height)}
          </span>
          <span>笔画：{strokes.length}</span>
          <span>可重做：{redoStack.length}</span>
        </div>
      </div>
    </div>
  );
}

function MaskSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mask-slider">
      <div>
        <span>{props.label}</span>
        <input
          className="mask-slider-value"
          type="number"
          value={Number(props.value.toFixed(2))}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
      </div>

      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

function BrushCursor(props: {
  stageRef: MutableRefObject<Konva.Stage | null>;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  size: number;
  color: string;
  tool: MaskTool;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const stage = props.stageRef.current;
    if (!stage) return;

    function move() {
      const s = props.stageRef.current;
      if (!s) return;

      const p = s.getPointerPosition();
      if (!p) {
        setPos(null);
        return;
      }

      if (
        p.x < props.frame.x ||
        p.y < props.frame.y ||
        p.x > props.frame.x + props.frame.width ||
        p.y > props.frame.y + props.frame.height
      ) {
        setPos(null);
        return;
      }

      setPos(p);
    }

    function leave() {
      setPos(null);
    }

    stage.on("mousemove", move);
    stage.on("mouseleave", leave);

    return () => {
      stage.off("mousemove", move);
      stage.off("mouseleave", leave);
    };
  }, [
    props.stageRef,
    props.frame.x,
    props.frame.y,
    props.frame.width,
    props.frame.height,
  ]);

  if (!pos) return null;

  return (
    <Circle
      x={pos.x}
      y={pos.y}
      radius={(props.size * props.frame.scale) / 2}
      stroke={props.tool === "brush" ? props.color : "#ffffff"}
      strokeWidth={1}
      opacity={0.9}
      listening={false}
    />
  );
}
