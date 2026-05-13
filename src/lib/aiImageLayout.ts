import type { CanvasElement } from "../editor/types";

export const NEW_AI_IMAGE_GAP = 24;
const TXT_GEN_MAX_SIDE = 520;

export function loadImageNaturalSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
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

export async function layoutNewAiImageBox(
  url: string,
  ref: CanvasElement | undefined,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const fallbackAr = 16 / 9;
  let aspect = fallbackAr;
  try {
    const d = await loadImageNaturalSize(url);
    aspect = d.w / d.h;
  } catch {
    /* 回落 16:9 */
  }

  if (ref?.type === "image") {
    const width = Math.max(1, ref.width);
    const height = width / aspect;
    return {
      x: ref.x + ref.width + NEW_AI_IMAGE_GAP,
      y: ref.y,
      width,
      height,
    };
  }

  if (aspect >= 1) {
    const width = TXT_GEN_MAX_SIDE;
    const height = width / aspect;
    return { x: 460, y: 340, width, height };
  }
  const height = TXT_GEN_MAX_SIDE;
  const width = height * aspect;
  return { x: 460, y: 340, width, height };
}
