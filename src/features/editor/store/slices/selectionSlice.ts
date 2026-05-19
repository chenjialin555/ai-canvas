import type { StoreGet, StoreSet } from "../sliceTypes";

export function createSelectionSlice(set: StoreSet, get: StoreGet) {
  return {
    clearCanvasSelection: () =>
      set({ selectedIds: [], selectedWorkflowNodeIds: [] }),

    setSelectedIds: (ids: string[]) =>
      set((state) => ({
        selectedIds: ids,
        /** 选中画布元素时清空 AI 节点选区，避免 Copy/Delete 语义冲突 */
        selectedWorkflowNodeIds:
          ids.length > 0 ? [] : state.selectedWorkflowNodeIds,
        /** 新选区时清除，避免拖移/变换结束后标志残留导致浮动条永远不出现 */
        floatingToolbarSuppressed: false,
      })),

    setSelectedWorkflowNodeIds: (ids: string[]) =>
      set((state) => ({
        selectedWorkflowNodeIds: ids,
        /** 选中 AI 节点时清空画布元素选区 */
        selectedIds: ids.length > 0 ? [] : state.selectedIds,
      })),

    selectAll: () => {
      const page = get().getActivePage();
      set({
        selectedIds: page.elements
          .filter((el) => el.visible && !el.locked && !el.parentId)
          .map((el) => el.id),
      });
    },
  };
}
