import type { StoreApi } from "zustand";
import type { Store } from "../types";
import { LOCAL_STORAGE_PERSIST_DEBOUNCE_MS } from "../constants";
import { tryWriteProjectToLocalStorage } from "./localStoragePersist";

export function setupAutoPersist(useEditorStore: StoreApi<Store>): void {
  let localStoragePersistTimer: ReturnType<typeof setTimeout> | null = null;

  useEditorStore.subscribe(() => {
    if (localStoragePersistTimer !== null) {
      clearTimeout(localStoragePersistTimer);
    }
    localStoragePersistTimer = setTimeout(() => {
      localStoragePersistTimer = null;
      const state = useEditorStore.getState();
      tryWriteProjectToLocalStorage({
        pages: state.pages,
        activePageId: state.activePageId,
        zoom: state.zoom,
        pan: state.pan,
        quickToolbarConfig: state.quickToolbarConfig,
        editorMode: state.editorMode,
      });
    }, LOCAL_STORAGE_PERSIST_DEBOUNCE_MS);
  });
}
