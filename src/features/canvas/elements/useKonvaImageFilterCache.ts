import { useEffect, useMemo, useRef, type RefObject } from "react";
import type Konva from "konva";
import type { KonvaImageFilterProps } from "../../editor/image-filter/imageFilter";
import { createRafBatcher } from "../utils/rafBatcher";

/** Konva 滤镜依赖 cache()；拖动滑块时合并为每帧最多 cache 一次 */
export function useKonvaImageFilterCache(
  imageRef: RefObject<Konva.Image | null>,
  konva: KonvaImageFilterProps,
  revision: string,
) {
  const konvaRef = useRef(konva);
  konvaRef.current = konva;

  const scheduleCache = useMemo(
    () =>
      createRafBatcher<null>(() => {
        const node = imageRef.current;
        const k = konvaRef.current;
        if (!node) return;

        if (!k.hasFilters) {
          node.clearCache();
          node.filters([]);
          node.getLayer()?.batchDraw();
          return;
        }

        try {
          node.cache();
          node.getLayer()?.batchDraw();
        } catch {
          node.clearCache();
          node.filters([]);
        }
      }),
    [imageRef],
  );

  useEffect(() => {
    scheduleCache(null);
    return () => {
      scheduleCache.cancel();
    };
  }, [revision, scheduleCache]);

  useEffect(
    () => () => {
      const node = imageRef.current;
      if (node) {
        node.clearCache();
        node.filters([]);
      }
    },
    [imageRef],
  );
}
