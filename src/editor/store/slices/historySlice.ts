import { produce } from "immer";
import type { Store, Snapshot } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { clone } from "../helpers/clone";

function makeSnapshot(state: Store): Snapshot {
  return {
    pages: clone(state.pages),
    activePageId: state.activePageId,
    selectedIds: clone(state.selectedIds),
    selectedWorkflowNodeIds: clone(state.selectedWorkflowNodeIds),
    zoom: state.zoom,
    pan: clone(state.pan),
  };
}

export function createHistorySlice(set: StoreSet, _get: StoreGet) {
  return {
    commitHistory: () => {
      set(
        produce<Store>((state) => {
          state.historyPast.push(makeSnapshot(state));
          if (state.historyPast.length > 100) state.historyPast.shift();
          state.historyFuture = [];
        }),
      );
    },

    undo: () => {
      set(
        produce<Store>((state) => {
          const last = state.historyPast.pop();
          if (!last) return;

          state.historyFuture.push(makeSnapshot(state));

          state.pages = last.pages;
          state.activePageId = last.activePageId;
          state.selectedIds = last.selectedIds;
          state.selectedWorkflowNodeIds = last.selectedWorkflowNodeIds;
          state.zoom = last.zoom;
          state.pan = last.pan;
          state.editingTextId = null;
        }),
      );
    },

    redo: () => {
      set(
        produce<Store>((state) => {
          const next = state.historyFuture.pop();
          if (!next) return;

          state.historyPast.push(makeSnapshot(state));

          state.pages = next.pages;
          state.activePageId = next.activePageId;
          state.selectedIds = next.selectedIds;
          state.selectedWorkflowNodeIds = next.selectedWorkflowNodeIds;
          state.zoom = next.zoom;
          state.pan = next.pan;
          state.editingTextId = null;
        }),
      );
    },
  };
}
