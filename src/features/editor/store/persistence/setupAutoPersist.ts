import type { StoreApi } from "zustand";
import type { Store } from "../types";
import { LOCAL_STORAGE_PERSIST_DEBOUNCE_MS } from "../constants";
import { tryWriteProjectToLocalStorage } from "./localStoragePersist";

const VIEWPORT_PERSIST_DEBOUNCE_MS = 2000;

/**
 * 页面数据与视口分开防抖：pan/zoom 高频变化时不反复 stringify 整包 pages。
 */
export function setupAutoPersist(useEditorStore: StoreApi<Store>): void {
  let pagesTimer: ReturnType<typeof setTimeout> | null = null;
  let viewportTimer: ReturnType<typeof setTimeout> | null = null;

  useEditorStore.subscribe((state, prev) => {
    const pagesChanged =
      state.pages !== prev.pages || state.activePageId !== prev.activePageId;

    if (pagesChanged) {
      if (pagesTimer !== null) clearTimeout(pagesTimer);
      pagesTimer = setTimeout(() => {
        pagesTimer = null;
        const s = useEditorStore.getState();
        tryWriteProjectToLocalStorage({
          pages: s.pages,
          activePageId: s.activePageId,
          zoom: s.zoom,
          pan: s.pan,
          quickToolbarConfig: s.quickToolbarConfig,
          editorMode: s.editorMode,
        });
      }, LOCAL_STORAGE_PERSIST_DEBOUNCE_MS);
    }

    const viewportChanged =
      state.zoom !== prev.zoom ||
      state.pan.x !== prev.pan.x ||
      state.pan.y !== prev.pan.y ||
      state.quickToolbarConfig !== prev.quickToolbarConfig ||
      state.editorMode !== prev.editorMode;

    if (viewportChanged && !pagesChanged) {
      if (viewportTimer !== null) clearTimeout(viewportTimer);
      viewportTimer = setTimeout(() => {
        viewportTimer = null;
        const s = useEditorStore.getState();
        tryWriteProjectToLocalStorage({
          pages: s.pages,
          activePageId: s.activePageId,
          zoom: s.zoom,
          pan: s.pan,
          quickToolbarConfig: s.quickToolbarConfig,
          editorMode: s.editorMode,
        });
      }, VIEWPORT_PERSIST_DEBOUNCE_MS);
    }
  });
}
