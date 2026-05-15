import type { ToolType } from "../../types";
import type { StoreGet, StoreSet } from "../sliceTypes";

export function createViewportSlice(set: StoreSet, _get: StoreGet) {
  return {
    setZoom: (zoom: number) => set({ zoom }),
    setPan: (pan: { x: number; y: number }) => set({ pan }),
    setTool: (tool: ToolType) => set({ tool }),
    setEditingTextId: (id: string | null) => set({ editingTextId: id }),
  };
}
