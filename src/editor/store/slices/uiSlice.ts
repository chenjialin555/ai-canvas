import { produce } from "immer";
import {
  normalizeQuickToolbarIds,
  type QuickToolId,
  type QuickToolbarScopeKey,
} from "../../quickTools";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";

export function createUiSlice(set: StoreSet, _get: StoreGet) {
  return {
    setQuickToolbarConfig: (scope: QuickToolbarScopeKey, ids: QuickToolId[]) => {
      set(
        produce<Store>((state) => {
          state.quickToolbarConfig[scope] = normalizeQuickToolbarIds(
            ids,
            scope,
          );
        }),
      );
    },

    setMarqueeSelecting: (v: boolean) => set({ marqueeSelecting: v }),

    setFloatingToolbarSuppressed: (v: boolean) =>
      set({ floatingToolbarSuppressed: v }),

    setEditorMode: () =>
      set({
        editorMode: "canvas",
      }),
  };
}
