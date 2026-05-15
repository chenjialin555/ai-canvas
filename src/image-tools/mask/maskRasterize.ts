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
