import { produce } from "immer";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { getBounds } from "../helpers/geometry";

export function createArrangeSlice(set: StoreSet, get: StoreGet) {
  return {
    alignSelected: (
      type:
        | "left"
        | "center"
        | "right"
        | "top"
        | "middle"
        | "bottom",
    ) => {
      const selected = get().getSelectedElements();
      if (selected.length < 2) return;

      get().commitHistory();

      const bounds = getBounds(selected);

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;

          for (const el of page.elements) {
            if (!state.selectedIds.includes(el.id) || el.locked) continue;

            if (type === "left") el.x = bounds.x;
            if (type === "right") el.x = bounds.right - el.width;
            if (type === "center") el.x = bounds.centerX - el.width / 2;
            if (type === "top") el.y = bounds.y;
            if (type === "bottom") el.y = bounds.bottom - el.height;
            if (type === "middle") el.y = bounds.centerY - el.height / 2;
          }
        }),
      );
    },

    distributeSelected: (type: "horizontal" | "vertical") => {
      const selected = get().getSelectedElements();
      if (selected.length < 3) return;

      get().commitHistory();

      const sorted =
        type === "horizontal"
          ? [...selected].sort((a, b) => a.x - b.x)
          : [...selected].sort((a, b) => a.y - b.y);

      const first = sorted[0]!;
      const last = sorted[sorted.length - 1]!;

      if (type === "horizontal") {
        const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
        const gap =
          (last.x + last.width - first.x - totalWidth) / (sorted.length - 1);

        let cursor = first.x;

        set(
          produce<Store>((state) => {
            const page = state.pages.find((p) => p.id === state.activePageId);
            if (!page) return;

            for (const item of sorted) {
              const el = page.elements.find((e) => e.id === item.id);
              if (!el || el.locked) continue;
              el.x = cursor;
              cursor += el.width + gap;
            }
          }),
        );
      } else {
        const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
        const gap =
          (last.y + last.height - first.y - totalHeight) / (sorted.length - 1);

        let cursor = first.y;

        set(
          produce<Store>((state) => {
            const page = state.pages.find((p) => p.id === state.activePageId);
            if (!page) return;

            for (const item of sorted) {
              const el = page.elements.find((e) => e.id === item.id);
              if (!el || el.locked) continue;
              el.y = cursor;
              cursor += el.height + gap;
            }
          }),
        );
      }
    },

    bringForward: (id: string) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          const index = page.elements.findIndex((el) => el.id === id);
          if (index < 0 || index >= page.elements.length - 1) return;
          const item = page.elements[index]!;
          page.elements[index] = page.elements[index + 1]!;
          page.elements[index + 1] = item;
        }),
      );
    },

    sendBackward: (id: string) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          const index = page.elements.findIndex((el) => el.id === id);
          if (index <= 0) return;
          const item = page.elements[index]!;
          page.elements[index] = page.elements[index - 1]!;
          page.elements[index - 1] = item;
        }),
      );
    },

    bringToFront: (id: string) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          const index = page.elements.findIndex((el) => el.id === id);
          if (index < 0) return;
          const [item] = page.elements.splice(index, 1);
          if (item) page.elements.push(item);
        }),
      );
    },

    sendToBack: (id: string) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          const index = page.elements.findIndex((el) => el.id === id);
          if (index < 0) return;
          const [item] = page.elements.splice(index, 1);
          if (item) page.elements.unshift(item);
        }),
      );
    },
  };
}
