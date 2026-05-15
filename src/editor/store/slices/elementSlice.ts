import { produce } from "immer";
import type { CanvasElement, ImageMaskData } from "../../types";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";

export function createElementSlice(set: StoreSet, get: StoreGet) {
  return {
    getActivePage: () => {
      const state = get();
      return state.pages.find((p) => p.id === state.activePageId)!;
    },

    getSelectedElements: () => {
      const state = get();
      const page = state.getActivePage();
      return page.elements.filter((el) => state.selectedIds.includes(el.id));
    },

    updateElement: (
      id: string,
      patch: Partial<CanvasElement>,
      options?: { history?: boolean },
    ) => {
      if (options?.history !== false) get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          const el = page?.elements.find((item) => item.id === id);
          if (!el) return;

          const patchKeys = Object.keys(patch) as (keyof CanvasElement)[];
          const allowedWhenLocked = new Set<keyof CanvasElement>([
            "locked",
            "visible",
          ]);
          if (
            el.locked &&
            !patchKeys.every((k) => allowedWhenLocked.has(k))
          ) {
            return;
          }

          Object.assign(el, patch);
        }),
      );
    },

    addElement: (element: CanvasElement) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.elements.push(element);
          state.selectedIds = [element.id];
        }),
      );
    },

    removeSelected: () => {
      const wfIds = get().selectedWorkflowNodeIds;
      const elIds = get().selectedIds;
      if (!wfIds.length && !elIds.length) return;
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;

          const removedEls = new Set(state.selectedIds);
          if (removedEls.size > 0) {
            page.elements = page.elements.filter((el) => !removedEls.has(el.id));
          }

          const removedWf = new Set(state.selectedWorkflowNodeIds);
          if (removedWf.size > 0) {
            page.aiNodes = page.aiNodes.filter((n) => !removedWf.has(n.id));
          }

          page.edges = page.edges.filter((e) => {
            if (
              e.from.kind === "image-element" &&
              removedEls.has(e.from.elementId)
            ) {
              return false;
            }
            if (e.from.kind === "ai-node" && removedWf.has(e.from.nodeId)) {
              return false;
            }
            if (e.to.kind === "ai-node" && removedWf.has(e.to.nodeId)) {
              return false;
            }
            return true;
          });

          state.selectedIds = [];
          state.selectedWorkflowNodeIds = [];
        }),
      );
    },

    replaceImageKeepFrame: (id: string, src: string) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          const el = page?.elements.find((item) => item.id === id);
          if (!el || el.type !== "image") return;

          el.src = src;
          el.cropOffsetX = 0;
          el.cropOffsetY = 0;
          el.cropScale = 1;
          el.cropRotation = 0;
          el.flipX = false;
          el.flipY = false;
          el.aiMask = null;
        }),
      );
    },

    setImageAIMask: (id: string, mask: ImageMaskData | null) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          const el = page?.elements.find((item) => item.id === id);
          if (!el || el.type !== "image") return;
          el.aiMask = mask;
        }),
      );
    },

    clearImageAIMask: (id: string) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          const el = page?.elements.find((item) => item.id === id);
          if (!el || el.type !== "image") return;
          el.aiMask = null;
        }),
      );
    },
  };
}
