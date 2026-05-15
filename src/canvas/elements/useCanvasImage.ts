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

export function useCanvasImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    let cancelled = false;

    const load = (url: string) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!cancelled) setImage(img);
      };
      img.onerror = () => {
        const fb = SRC_FALLBACK[src];
        if (fb && fb !== url) {
          load(fb);
          return;
        }
        if (!cancelled) setImage(null);
      };
      img.src = url;
    };

    load(src);
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}
