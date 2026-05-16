import type { ToolType } from "../../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { getDefaultStageContentSize } from "../../../canvas/utils/stageViewportSize";

export function createViewportSlice(set: StoreSet, get: StoreGet) {
  return {
    setZoom: (zoom: number) => set({ zoom }),
    setPan: (pan: { x: number; y: number }) => set({ pan }),
    setTool: (tool: ToolType) => set({ tool }),
    setEditingTextId: (id: string | null) => set({ editingTextId: id }),

    /** 将画布平移使该元素中心落在 Stage 视口中心（不改变 zoom） */
    centerViewOnElement: (elementId: string) => {
      const page = get().getActivePage();
      const el = page.elements.find((e) => e.id === elementId);
      if (!el) return;
      const { width: sw, height: sh } = getDefaultStageContentSize();
      const z = get().zoom;
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      set({ pan: { x: sw / 2 - cx * z, y: sh / 2 - cy * z } });
    },
  };
}
