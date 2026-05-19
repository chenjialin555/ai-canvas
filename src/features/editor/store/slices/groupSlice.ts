import { produce } from "immer";
import { nanoid } from "nanoid";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { getBounds } from "../helpers/geometry";

export function createGroupSlice(set: StoreSet, get: StoreGet) {
  return {
    groupSelected: () => {
      const selected = get().getSelectedElements();
      if (selected.length < 2) return;

      get().commitHistory();

      const bounds = getBounds(selected);
      const groupId = nanoid();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;

          for (const el of page.elements) {
            if (state.selectedIds.includes(el.id)) {
              el.parentId = groupId;
            }
          }

          page.elements.push({
            id: groupId,
            type: "group",
            name: "组合",
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            children: selected.map((el) => el.id),
          });

          state.selectedIds = [groupId];
        }),
      );
    },

    ungroupSelected: () => {
      const selected = get()
        .getSelectedElements()
        .filter((el) => el.type === "group");
      if (!selected.length) return;

      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;

          const groupIds = selected.map((el) => el.id);
          const childIds: string[] = [];

          for (const el of page.elements) {
            if (el.parentId && groupIds.includes(el.parentId)) {
              childIds.push(el.id);
              el.parentId = null;
            }
          }

          page.elements = page.elements.filter((el) => !groupIds.includes(el.id));
          state.selectedIds = childIds;
        }),
      );
    },
  };
}
