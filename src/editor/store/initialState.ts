import {
  DEFAULT_QUICK_TOOLBAR_CONFIG,
  mergeQuickToolbarConfig,
} from "../quickTools";
import type { EditorState, Page } from "../types";
import { STORAGE_KEY } from "./constants";
import { migratePage, makeDefaultPage } from "./helpers/pageMigration";

export function getInitial(): EditorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as {
        pages?: Page[];
        activePageId?: string;
        zoom?: number;
        pan?: { x: number; y: number };
        quickToolbarConfig?: unknown;
        editorMode?: string;
      };
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        const pages = data.pages.map(migratePage);
        return {
          pages,
          activePageId: data.activePageId || pages[0]!.id,
          selectedIds: [],
          zoom: typeof data.zoom === "number" ? data.zoom : 0.45,
          pan: data.pan || { x: 0, y: 0 },
          tool: "select",
          editingTextId: null,
          quickToolbarConfig: mergeQuickToolbarConfig(data.quickToolbarConfig),
          editorMode: "canvas",
          selectedWorkflowNodeIds: [],
          workflowConnecting: {
            active: false,
            from: null,
            dataType: null,
            pointerX: 0,
            pointerY: 0,
          },
          workflowNodePicker: {
            open: false,
            x: 0,
            y: 0,
          },
        };
      }
    }
  } catch {
    /* ignore */
  }

  const page = makeDefaultPage();

  return {
    pages: [page],
    activePageId: page.id,
    selectedIds: [],
    zoom: 0.45,
    pan: { x: 0, y: 0 },
    tool: "select",
    editingTextId: null,
    quickToolbarConfig: { ...DEFAULT_QUICK_TOOLBAR_CONFIG },
    editorMode: "canvas",
    selectedWorkflowNodeIds: [],
    workflowConnecting: {
      active: false,
      from: null,
      dataType: null,
      pointerX: 0,
      pointerY: 0,
    },
    workflowNodePicker: { open: false, x: 0, y: 0 },
  };
}
