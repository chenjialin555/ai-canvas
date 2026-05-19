import { normalizeImageFilter } from "../image-filter/imageFilter";
import type { ImageElement } from "../types";
import { canvasToDataUrl } from "./canvasEncode";
import {
  applyCanvasFilter,
  createImageClipPath,
  loadHtmlImage,
} from "./exportProject";

export type ImageElementRenderSize = {
  /** 与画布外框逻辑尺寸一致 */
  frameWidth: number;
  frameHeight: number;
  /** 导出像素宽（含 contain 放大） */
  pixelWidth: number;
  pixelHeight: number;
  outScale: number;
};

export type ImageRenderLimits = {
  maxPixelRatio?: number;
  maxLongEdge?: number;
};

/** 发给 AI 的栅格化上限：避免 4K 原图 × 外框放大导致千万级像素卡死主线程 */
export const MAX_API_RENDER_PIXEL_RATIO = 4;
export const MAX_API_RENDER_LONG_EDGE = 2048;

export function computeImageElementRenderSize(
  el: ImageElement,
  sourceW: number,
  sourceH: number,
  limits?: ImageRenderLimits,
): ImageElementRenderSize {
  const containScale = Math.min(el.width / sourceW, el.height / sourceH);
  let outScale =
    containScale > 0 && Number.isFinite(containScale) ? 1 / containScale : 1;

  if (limits?.maxPixelRatio) {
    outScale = Math.min(outScale, limits.maxPixelRatio);
  }

  let pixelWidth = Math.max(1, Math.round(el.width * outScale));
  let pixelHeight = Math.max(1, Math.round(el.height * outScale));

  if (limits?.maxLongEdge) {
    const longEdge = Math.max(pixelWidth, pixelHeight);
    if (longEdge > limits.maxLongEdge) {
      const factor = limits.maxLongEdge / longEdge;
      pixelWidth = Math.max(1, Math.round(pixelWidth * factor));
      pixelHeight = Math.max(1, Math.round(pixelHeight * factor));
      outScale *= factor;
    }
  }

  return {
    frameWidth: el.width,
    frameHeight: el.height,
    pixelWidth,
    pixelHeight,
    outScale,
  };
}

/** 将画布上可见的图片（裁剪 + 滤镜，不含晕影）栅格化到 Canvas */
export async function renderImageElementToCanvas(
  el: ImageElement,
  img?: HTMLImageElement,
  limits?: ImageRenderLimits,
): Promise<{ canvas: HTMLCanvasElement; size: ImageElementRenderSize } | null> {
  try {
    const source = img ?? (await loadHtmlImage(el.src));
    const iw = source.naturalWidth || source.width;
    const ih = source.naturalHeight || source.height;
    const size = computeImageElementRenderSize(el, iw, ih, limits);
    const finalScale = Math.min(el.width / iw, el.height / ih) * (el.cropScale || 1);

    const canvas = document.createElement("canvas");
    canvas.width = size.pixelWidth;
    canvas.height = size.pixelHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.save();
    ctx.scale(size.outScale, size.outScale);
    createImageClipPath(ctx, el);
    ctx.clip();

    applyCanvasFilter(ctx, normalizeImageFilter(el.filter));

    ctx.translate(
      el.width / 2 + (el.cropOffsetX || 0),
      el.height / 2 + (el.cropOffsetY || 0),
    );
    ctx.rotate(((el.cropRotation || 0) * Math.PI) / 180);
    ctx.scale(
      finalScale * (el.flipX ? -1 : 1),
      finalScale * (el.flipY ? -1 : 1),
    );
    ctx.drawImage(source, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();

    return { canvas, size };
  } catch (e) {
    console.warn("[renderImageElement] failed:", e);
    return null;
  }
}

export type RenderImageElementOptions = {
  forApi?: boolean;
};

export async function renderImageElementToDataURL(
  el: ImageElement,
  mime: "image/png" | "image/jpeg" = "image/png",
  options?: RenderImageElementOptions,
): Promise<{ dataUrl: string; size: ImageElementRenderSize } | null> {
  const limits = options?.forApi
    ? {
        maxPixelRatio: MAX_API_RENDER_PIXEL_RATIO,
        maxLongEdge: MAX_API_RENDER_LONG_EDGE,
      }
    : undefined;

  const rendered = await renderImageElementToCanvas(el, undefined, limits);
  if (!rendered) return null;

  const quality = mime === "image/jpeg" ? 0.88 : undefined;
  const dataUrl = await canvasToDataUrl(rendered.canvas, mime, quality);
  return { dataUrl, size: rendered.size };
}
