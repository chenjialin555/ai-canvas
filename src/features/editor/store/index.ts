import { create } from "zustand";
import type { Store } from "./types";
import { getInitial } from "./initialState";
import { EMPTY_ELEMENT_CLIPBOARD } from "./slices/clipboardSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createSelectionSlice } from "./slices/selectionSlice";
import { createElementSlice } from "./slices/elementSlice";
import { createClipboardSlice } from "./slices/clipboardSlice";
import { createArrangeSlice } from "./slices/arrangeSlice";
import { createGroupSlice } from "./slices/groupSlice";
import { createViewportSlice } from "./slices/viewportSlice";
import { createUiSlice } from "./slices/uiSlice";
import { createPageSlice } from "./slices/pageSlice";
import { createProjectSlice } from "./slices/projectSlice";
import { createWorkflowSlice } from "../../workflow/store/workflowSlice";
import { setupAutoPersist } from "./persistence/setupAutoPersist";

export const useEditorStore = create<Store>()((set, get) => ({
  ...getInitial(),

  marqueeSelecting: false,
  floatingToolbarSuppressed: false,

  historyPast: [],
  historyFuture: [],

  clipboard: EMPTY_ELEMENT_CLIPBOARD,

  ...createHistorySlice(set, get),
  ...createSelectionSlice(set, get),
  ...createElementSlice(set, get),
  ...createClipboardSlice(set, get),
  ...createArrangeSlice(set, get),
  ...createGroupSlice(set, get),
  ...createViewportSlice(set, get),
  ...createUiSlice(set, get),
  ...createPageSlice(set, get),
  ...createProjectSlice(set, get),
  ...createWorkflowSlice(set, get),
}));

setupAutoPersist(useEditorStore);

export { STORAGE_KEY } from "./constants";
export { clone } from "./helpers/clone";
export { fallback, getImageDefaults, makeImage } from "./helpers/imageDefaults";
export type { Store, Snapshot, EditorClipboard } from "./types";
