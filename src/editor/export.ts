import type { ImageElement, ProjectJSON } from "./types";

export function downloadJSON(
  data: ProjectJSON,
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
  const f = filter || {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
  };

  const brightness = 100 + f.brightness * 100;
  const contrast = 100 + f.contrast;
  const saturation = 100 + f.saturation * 100;
  const blur = f.blur || 0;

  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
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

export async function exportCroppedImageAsPNG(el: ImageElement) {
  try {
    const img = await loadHtmlImage(el.src);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(el.width);
    canvas.height = Math.round(el.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();

    createImageClipPath(ctx, el);
    ctx.clip();

    applyCanvasFilter(ctx, el.filter);

    const baseScale = Math.max(el.width / img.width, el.height / img.height);
    const finalScale = baseScale * (el.cropScale || 1);

    ctx.translate(
      el.width / 2 + (el.cropOffsetX || 0),
      el.height / 2 + (el.cropOffsetY || 0),
    );

    ctx.rotate(((el.cropRotation || 0) * Math.PI) / 180);

    ctx.scale(
      finalScale * (el.flipX ? -1 : 1),
      finalScale * (el.flipY ? -1 : 1),
    );

    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();

    downloadDataURL(
      canvas.toDataURL("image/png"),
      `${el.name || "cropped-image"}.png`,
    );
  } catch {
    alert(
      "导出失败。如果使用的是跨域网络图片，请换成本地 public/assets 图片。",
    );
  }
}
