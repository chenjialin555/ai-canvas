import Konva from "konva";
import type { HitContext, SceneContext } from "konva/lib/Context";

/** Transformer 旋转柄：白底圆 + 弧形箭头（Konva 默认方块/线不易辨认） */
export function rotateAnchorSceneFunc(
  ctx: SceneContext,
  shape: Konva.Rect,
): void {
  const w = shape.width();
  const h = shape.height();
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.34;
  const col = "#2f7cff";

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-cx, -cy);

  ctx.beginPath();
  ctx.arc(cx, cy, R + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  const startA = Math.PI * 0.55;
  const sweep = Math.PI * 1.52;
  const endA = startA + sweep;

  ctx.beginPath();
  ctx.arc(cx, cy, R - 1.6, startA, endA, false);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.25;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  const rr = R - 1.6;
  const tipX = cx + rr * Math.cos(endA);
  const tipY = cy + rr * Math.sin(endA);
  const tangent = endA + Math.PI / 2;
  const wing = 4.2;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - wing * Math.cos(tangent - 0.55),
    tipY - wing * Math.sin(tangent - 0.55),
  );
  ctx.lineTo(
    tipX - wing * Math.cos(tangent + 0.55),
    tipY - wing * Math.sin(tangent + 0.55),
  );
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();

  ctx.restore();
}

/** 命中层必须用 fillStrokeShape(shape)，否则会画成普通颜色而非 colorKey，点选检测不到 */
export function rotateAnchorHitFunc(
  ctx: HitContext,
  shape: Konva.Rect,
): void {
  const w = shape.width();
  const h = shape.height();
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(w, h) / 2 + 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStrokeShape(shape);
}

/** 旋转柄布局（供 anchorStyleFunc 与 transformend 后复位共用） */
export function styleRotaterAnchor(anchor: Konva.Node, tr: Konva.Transformer): void {
  const nm = anchor.name();
  if (!nm || !nm.startsWith("rotater")) return;
  if (typeof tr.height !== "function") return;
  const h = tr.height();
  const pad = tr.padding();
  const gap = tr.rotateAnchorOffset();
  const size = 28;
  const half = size / 2;
  anchor.setAttrs({
    x: 0,
    y: h / 2,
    offsetX: half + pad + gap,
    offsetY: half,
    width: size,
    height: size,
    cornerRadius: 0,
    fillEnabled: true,
    fill: "#ffffff",
    strokeEnabled: false,
    sceneFunc: rotateAnchorSceneFunc,
    hitFunc: rotateAnchorHitFunc,
  });
}
