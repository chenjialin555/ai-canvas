import { produce } from "immer";
import { nanoid } from "nanoid";
import type { Page } from "../../types";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { clone } from "../helpers/clone";
import { migratePage } from "../helpers/pageMigration";
import { clampAiNodeDimensions } from "../../../workflow/utils/unifiedGraph";

export function createPageSlice(set: StoreSet, get: StoreGet) {
  return {
    addPage: () => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page: Page = {
            id: nanoid(),
            name: `页面 ${state.pages.length + 1}`,
            elements: [],
            aiNodes: [],
            edges: [],
          };
          state.pages.push(page);
          state.activePageId = page.id;
          state.selectedIds = [];
        }),
      );
    },

    duplicatePage: (id: string) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === id);
          if (!page) return;

          const copy = migratePage(clone(page));
          copy.id = nanoid();
          copy.name = `${page.name}_复制`;

          const elIdMap = new Map<string, string>();
          copy.elements = copy.elements.map((el) => {
            const nid = nanoid();
            elIdMap.set(el.id, nid);
            return {
              ...el,
              id: nid,
              parentId: null,
            };
          });

          const nodeIdMap = new Map<string, string>();
          copy.aiNodes = copy.aiNodes.map((n) => {
            const nid = nanoid();
            nodeIdMap.set(n.id, nid);
            return clampAiNodeDimensions({ ...n, id: nid });
          });

          copy.edges = copy.edges.map((e) => ({
            ...e,
            id: nanoid(),
            from:
              e.from.kind === "image-element"
                ? {
                    ...e.from,
                    elementId: elIdMap.get(e.from.elementId) ?? e.from.elementId,
                  }
                : {
                    ...e.from,
                    nodeId: nodeIdMap.get(e.from.nodeId) ?? e.from.nodeId,
                  },
            to:
              e.to.kind === "image-element"
                ? {
                    ...e.to,
                    elementId: elIdMap.get(e.to.elementId) ?? e.to.elementId,
                  }
                : {
                    ...e.to,
                    nodeId: nodeIdMap.get(e.to.nodeId) ?? e.to.nodeId,
                  },
          }));

          state.pages.push(copy);
          state.activePageId = copy.id;
          state.selectedIds = [];
          state.selectedWorkflowNodeIds = [];
        }),
      );
    },

    removePage: (id: string) => {
      if (get().pages.length <= 1) return;
      get().commitHistory();

      set(
        produce<Store>((state) => {
          state.pages = state.pages.filter((p) => p.id !== id);
          if (state.activePageId === id) {
            state.activePageId = state.pages[0]!.id;
          }
          state.selectedIds = [];
          state.selectedWorkflowNodeIds = [];
        }),
      );
    },

    renamePage: (id: string, name: string) => {
      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === id);
          if (page) page.name = name;
        }),
      );
    },

    setActivePageId: (id: string) => {
      set({
        activePageId: id,
        selectedIds: [],
        editingTextId: null,
        selectedWorkflowNodeIds: [],
      });
    },
  };
}
