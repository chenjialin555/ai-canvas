import { useEffect, useState } from "react";
import { fallback } from "../../editor/store";

const SRC_FALLBACK: Record<string, string> = {
  "/assets/ref-board-01.jpg": fallback.ref1,
  "/assets/ref-board-02.jpg": fallback.ref2,
  "/assets/interior-01.jpg": fallback.room1,
  "/assets/interior-02.jpg": fallback.room2,
  "/assets/ui-shot-01.jpg": fallback.ui1,
  "/assets/ui-shot-02.jpg": fallback.ui2,
};

export type CanvasImageLoadPhase = "idle" | "loading" | "loaded" | "error";

export function isRemoteImageSrc(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}

export type UseCanvasImageResult = {
  image: HTMLImageElement | null;
  /** 远程 URL 图片尚未解码完成 */
  loading: boolean;
  phase: CanvasImageLoadPhase;
};

export function useCanvasImage(src?: string): UseCanvasImageResult {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [phase, setPhase] = useState<CanvasImageLoadPhase>("idle");

  useEffect(() => {
    if (!src) {
      setImage(null);
      setPhase("idle");
      return;
    }

    let cancelled = false;
    const remote = isRemoteImageSrc(src);

    setImage(null);
    setPhase(remote ? "loading" : "loading");

    const load = (url: string) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!cancelled) {
          setImage(img);
          setPhase("loaded");
        }
      };
      img.onerror = () => {
        const fb = SRC_FALLBACK[src];
        if (fb && fb !== url) {
          load(fb);
          return;
        }
        if (!cancelled) {
          setImage(null);
          setPhase("error");
        }
      };
      img.src = url;
    };

    load(src);
    return () => {
      cancelled = true;
    };
  }, [src]);

  const loading = !!src && isRemoteImageSrc(src) && phase === "loading";

  return { image, loading, phase };
}
