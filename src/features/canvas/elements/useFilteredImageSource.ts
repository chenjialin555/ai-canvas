import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_IMAGE_FILTER,
  normalizeImageFilter,
  toCssCanvasFilter,
  type ImageFilter,
} from "../../editor/image-filter/imageFilter";
import { imageFilterRevision } from "../../editor/image-filter/filterRevision";

function renderFilteredCanvas(
  source: HTMLImageElement,
  filter: ImageFilter,
): HTMLCanvasElement | null {
  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  if (w < 1 || h < 1) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.filter = toCssCanvasFilter(filter);
  try {
    ctx.drawImage(source, 0, 0, w, h);
  } catch (e) {
    console.warn("[useFilteredImageSource] drawImage failed:", e);
    return null;
  }
  return canvas;
}

/**
 * 用 Canvas2D + CSS filter 渲染调整结果（不依赖 Konva cache，跨域 OSS 图也可用）。
 */
export function useFilteredImageSource(
  source: HTMLImageElement | null,
  filterRevisionKey: string,
  filterRaw: ImageFilter | undefined,
): HTMLImageElement | HTMLCanvasElement | null {
  const filterRef = useRef(normalizeImageFilter(filterRaw));
  filterRef.current = normalizeImageFilter(filterRaw);

  const [filtered, setFiltered] = useState<HTMLCanvasElement | null>(null);
  const isDefault =
    filterRevisionKey === imageFilterRevision(DEFAULT_IMAGE_FILTER);

  useEffect(() => {
    if (!source || isDefault) {
      setFiltered(null);
      return;
    }

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled || !source) return;
      const canvas = renderFilteredCanvas(source, filterRef.current);
      if (!cancelled) setFiltered(canvas);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [source, source?.src, filterRevisionKey, isDefault]);

  if (!source || isDefault) return source;
  return filtered ?? source;
}
