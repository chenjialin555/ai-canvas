import type { ImageElement, ImageMaskData } from "../../editor/types";

export function exportMaskToDataURL(mask: ImageMaskData): string {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(mask.width));
  canvas.height = Math.max(1, Math.round(mask.height));

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of mask.strokes) {
    if (!stroke.points.length) continue;

    ctx.save();

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color || "rgba(255,0,0,1)";
    }

    ctx.globalAlpha = stroke.opacity;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();

    const points = stroke.points;

    ctx.moveTo(points[0]!, points[1]!);

    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i]!, points[i + 1]!);
    }

    ctx.stroke();
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

export function exportImageMaskToDataURL(image: ImageElement): string | null {
  if (!image.aiMask) return null;
  return exportMaskToDataURL(image.aiMask);
}

/** 将帧坐标系蒙版缩放到与渲染导出图相同的像素尺寸 */
export async function exportImageMaskToDataURLAtSize(
  image: ImageElement,
  pixelWidth: number,
  pixelHeight: number,
): Promise<string | null> {
  if (!image.aiMask?.strokes.length) return null;
  const mask = image.aiMask;
  if (
    Math.round(mask.width) === Math.round(pixelWidth) &&
    Math.round(mask.height) === Math.round(pixelHeight)
  ) {
    return exportMaskToDataURL(mask);
  }

  const src = exportMaskToDataURL(mask);
  if (!src) return null;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelWidth));
  canvas.height = Math.max(1, Math.round(pixelHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const tmp = new Image();
  return new Promise<string | null>((resolve) => {
    tmp.onload = () => {
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    tmp.onerror = () => resolve(src);
    tmp.src = src;
  });
}
