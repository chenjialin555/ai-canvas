import { produce } from "immer";
import { nanoid } from "nanoid";
import type { CanvasElement } from "../../types";
import type { Store, EditorClipboard } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { clone } from "../helpers/clone";
import { endpointKey } from "../../../workflow/utils/workflowEndpoint";
import {
  clampAiNodeDimensions,
} from "../../../workflow/utils/unifiedGraph";
import type { NodeEdge, WorkflowNode } from "../../../workflow/model/types";

export const EMPTY_ELEMENT_CLIPBOARD: EditorClipboard = {
  kind: "elements",
  items: [],
};

export function createClipboardSlice(set: StoreSet, get: StoreGet) {
  return {
    copy: () => {
      const state = get();
      const wfIds = state.selectedWorkflowNodeIds;
      if (wfIds.length > 0) {
        const idSet = new Set(wfIds);
        const page = state.getActivePage();
        const nodes = page.aiNodes
          .filter((n) => idSet.has(n.id))
          .map((n) => clone(n));
        const internalEdges = page.edges.filter((e) => {
          if (e.from.kind !== "ai-node" || e.to.kind !== "ai-node")
            return false;
          return idSet.has(e.from.nodeId) && idSet.has(e.to.nodeId);
        });
        set({
          clipboard: {
            kind: "workflow",
            nodes,
            internalEdges: internalEdges.map((e) => clone(e)),
          },
        });
        return;
      }

      const selected = get().getSelectedElements();
      set({ clipboard: { kind: "elements", items: clone(selected) } });
    },

    paste: () => {
      const clip = get().clipboard;

      if (clip.kind === "workflow" && clip.nodes.length > 0) {
        get().commitHistory();
        const now = Date.now();
        const idMap = new Map<string, string>();
        const newNodes: WorkflowNode[] = clip.nodes.map((n) => {
          const newId = nanoid();
          idMap.set(n.id, newId);
          const base = clone(n);
          const copyTitle = base.title.endsWith(" 副本")
            ? base.title
            : `${base.title} 副本`;
          return clampAiNodeDimensions({
            ...base,
            id: newId,
            title: copyTitle,
            x: base.x + 28,
            y: base.y + 28,
            status: "idle",
            outputs: {},
            error: undefined,
            createdAt: now,
            updatedAt: now,
          });
        });

        const newEdges: NodeEdge[] = [];
        for (const e of clip.internalEdges) {
          if (e.from.kind !== "ai-node" || e.to.kind !== "ai-node") continue;
          const fromId = idMap.get(e.from.nodeId);
          const toId = idMap.get(e.to.nodeId);
          if (!fromId || !toId) continue;
          const mapped: NodeEdge = {
            ...clone(e),
            id: nanoid(),
            from: { kind: "ai-node", nodeId: fromId, portId: e.from.portId },
            to: { kind: "ai-node", nodeId: toId, portId: e.to.portId },
            createdAt: now,
          };
          newEdges.push(mapped);
        }

        set(
          produce<Store>((state) => {
            const page = state.pages.find((p) => p.id === state.activePageId);
            if (!page) return;
            page.aiNodes.push(...newNodes);
            for (const edge of newEdges) {
              if (
                page.edges.some(
                  (ex) =>
                    endpointKey(ex.from) === endpointKey(edge.from) &&
                    endpointKey(ex.to) === endpointKey(edge.to),
                )
              ) {
                continue;
              }
              page.edges.push(edge);
            }
            state.selectedWorkflowNodeIds = newNodes.map((n) => n.id);
            state.selectedIds = [];
          }),
        );
        return;
      }

      if (clip.kind !== "elements" || !clip.items.length) return;

      get().commitHistory();

      const pasted = clip.items.map((el, index) => ({
        ...clone(el),
        id: nanoid(),
        name: `${el.name}_复制`,
        x: el.x + 30 + index * 8,
        y: el.y + 30 + index * 8,
        locked: false,
        parentId: null,
      })) as CanvasElement[];

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.elements.push(...pasted);
          state.selectedIds = pasted.map((el) => el.id);
          state.selectedWorkflowNodeIds = [];
        }),
      );
    },
  };
}
