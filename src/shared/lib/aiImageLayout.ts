import type { CanvasElement } from "../../features/editor/types";

export const NEW_AI_IMAGE_GAP = 24;
/** 画布上图层最长边上限（宽或高），短边按比例缩放，支持 9:16 / 21:9 等任意比例 */
export const IMAGE_FRAME_MAX_SIDE = 520;

function loadImageNaturalSizeOnce(
  src: string,
  withCrossOrigin: boolean,
): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    if (withCrossOrigin && /^https?:\/\//i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w < 1 || h < 1) {
        reject(new Error("invalid natural dimensions"));
        return;
      }
      resolve({ w, h });
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** 读取原图像素尺寸；远程 URL 先带 CORS，失败再回退（仅用于布局，不读 canvas） */
export function loadImageNaturalSize(src: string): Promise<{ w: number; h: number }> {
  const remote = /^https?:\/\//i.test(src);
  return loadImageNaturalSizeOnce(src, remote).catch(() => {
    if (remote) return loadImageNaturalSizeOnce(src, false);
    throw new Error("image load failed");
  });
}

/** 按原图比例计算画布外框尺寸（最长边不超过 maxSide） */
export function computeImageFrameSize(
  naturalW: number,
  naturalH: number,
  maxSide = IMAGE_FRAME_MAX_SIDE,
): { width: number; height: number } {
  if (naturalW < 1 || naturalH < 1) {
    return { width: maxSide, height: Math.round(maxSide / (16 / 9)) };
  }
  const aspect = naturalW / naturalH;
  if (aspect >= 1) {
    const width = maxSide;
    return { width, height: Math.max(1, Math.round(width / aspect)) };
  }
  const height = maxSide;
  return { width: Math.max(1, Math.round(height * aspect)), height };
}

export async function loadImageFrameSize(
  src: string,
  maxSide = IMAGE_FRAME_MAX_SIDE,
): Promise<{ width: number; height: number }> {
  try {
    const d = await loadImageNaturalSize(src);
    return computeImageFrameSize(d.w, d.h, maxSide);
  } catch {
    return computeImageFrameSize(16, 9, maxSide);
  }
}

export async function layoutNewAiImageBox(
  url: string,
  ref: CanvasElement | undefined,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const frame = await loadImageFrameSize(url);

  if (ref?.type === "image") {
    return {
      x: ref.x + ref.width + NEW_AI_IMAGE_GAP,
      y: ref.y,
      ...frame,
    };
  }

  return { x: 460, y: 340, ...frame };
}

/** 换图并按原图比例重算外框 */
export async function replaceImageWithFitFrame(
  replaceImageFitFrame: (
    id: string,
    src: string,
    size: { width: number; height: number },
  ) => void,
  id: string,
  src: string,
): Promise<void> {
  const frame = await loadImageFrameSize(src);
  replaceImageFitFrame(id, src, frame);
}
