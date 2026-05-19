import { randomImageFilename } from "../../../shared/lib/randomFilename";
import { toCssCanvasFilter } from "../image-filter/imageFilter";
import type { ImageElement, ProjectJSON } from "../types";

/** 画布 contain 显示时，外框像素 → 原图像素的倍率 */
export const MAX_EXPORT_PIXEL_RATIO = 8;

export function computeImageFrameToSourceScale(
  frameW: number,
  frameH: number,
  sourceW: number,
  sourceH: number,
): number {
  const containScale = Math.min(frameW / sourceW, frameH / sourceH);
  if (containScale <= 0 || !Number.isFinite(containScale)) return 1;
  return 1 / containScale;
}

/** 为整页导出计算 pixelRatio：按图层层级中最「需要放大」的原图倍率 */
export async function computeMaxImageExportPixelRatio(
  images: ImageElement[],
  cap = MAX_EXPORT_PIXEL_RATIO,
): Promise<number> {
  let maxRatio = 2;
  await Promise.all(
    images.map(async (el) => {
      try {
        const img = await loadHtmlImage(el.src);
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const ratio = computeImageFrameToSourceScale(el.width, el.height, iw, ih);
        maxRatio = Math.max(maxRatio, ratio);
      } catch {
        /* 跨域或加载失败时跳过 */
      }
    }),
  );
  return Math.min(Math.max(2, maxRatio), cap);
}

export function downloadJSON(
  data: unknown,
  filename = "ai-canvas-project.json",
) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function readJSONFile(file: File): Promise<ProjectJSON> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as ProjectJSON);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function downloadDataURL(dataURL: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  a.click();
}

export async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function applyCanvasFilter(
  ctx: CanvasRenderingContext2D,
  filter: ImageElement["filter"],
) {
  ctx.filter = toCssCanvasFilter(filter);
}

export function createImageClipPath(
  ctx: CanvasRenderingContext2D,
  el: ImageElement,
) {
  const w = el.width;
  const h = el.height;

  ctx.beginPath();

  if (el.maskShape === "circle") {
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    return;
  }

  const radius = el.maskShape === "roundRect" ? el.cornerRadius || 0 : 0;

  if (!radius) {
    ctx.rect(0, 0, w, h);
    return;
  }

  const r = Math.min(radius, w / 2, h / 2);

  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
}

import { renderImageElementToDataURL } from "./renderImageElement";

export async function exportCroppedImageAsPNG(el: ImageElement) {
  try {
    const rendered = await renderImageElementToDataURL(el);
    if (!rendered) throw new Error("render failed");
    downloadDataURL(rendered.dataUrl, randomImageFilename("png"));
  } catch {
    alert(
      "导出失败。如果使用的是跨域网络图片，请换成本地 public/assets 图片。",
    );
  }
}
