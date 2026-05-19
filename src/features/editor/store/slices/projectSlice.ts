import { produce } from "immer";
import type { ProjectJSON } from "../../types";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { resolveApiFetchUrl } from "../../../../shared/api/client";
import { logApiEvent } from "../../../../shared/lib/apiDebug";
import { STORAGE_KEY } from "../constants";
import { normalizePagesImagesToUrls } from "../../export/normalizePagesImages";
import { clone } from "../helpers/clone";
import { migratePage } from "../helpers/pageMigration";
import { exportComfyWorkflow } from "../../../workflow/comfy/exportComfyWorkflow";
import {
  importComfyWorkflow,
  type ImportComfyResult,
} from "../../../workflow/comfy/importComfyWorkflow";
import type { ComfyWorkflowJSON } from "../../../workflow/comfy/comfyWorkflowTypes";

export function createProjectSlice(set: StoreSet, get: StoreGet) {
  return {
    exportProjectJSON: async (): Promise<ProjectJSON> => {
      const state = get();
      const pages = await normalizePagesImagesToUrls(state.pages, {
        apiName: "project-json-export",
      });
      return {
        version: "2.0.0",
        savedAt: new Date().toISOString(),
        pages,
        activePageId: state.activePageId,
      };
    },

    loadProjectJSON: async (json: ProjectJSON) => {
      if (!json.pages?.length) return;

      const migrated = clone(json.pages).map(migratePage);
      const pages = await normalizePagesImagesToUrls(migrated, {
        clone: false,
        apiName: "project-json-import",
      });

      set(
        produce<Store>((state) => {
          state.pages = pages;
          state.activePageId = json.activePageId || json.pages[0]!.id;
          state.selectedIds = [];
          state.editingTextId = null;
          state.historyPast = [];
          state.historyFuture = [];
          state.selectedWorkflowNodeIds = [];
        }),
      );
    },

    exportComfyWorkflowJSON: async (): Promise<ComfyWorkflowJSON> => {
      const state = get();
      const page = state.pages.find((p) => p.id === state.activePageId);
      if (!page) {
        return exportComfyWorkflow({
          id: "empty",
          name: "页面 1",
          elements: [],
          aiNodes: [],
          edges: [],
        });
      }
      return exportComfyWorkflow(page, {
        viewport: { zoom: state.zoom, pan: state.pan },
        uploadImagesToOss: true,
      });
    },

    loadComfyWorkflowJSON: (json: ComfyWorkflowJSON): ImportComfyResult => {
      const result = importComfyWorkflow(json);

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.aiNodes = result.aiNodes;
          page.edges = result.edges;
          if (result.elements.length) {
            const existing = new Set(page.elements.map((e) => e.id));
            for (const el of result.elements) {
              if (!existing.has(el.id)) {
                page.elements.push(el);
              } else {
                const idx = page.elements.findIndex((e) => e.id === el.id);
                if (idx >= 0) page.elements[idx] = el;
              }
            }
          }
          if (result.viewport) {
            state.zoom = result.viewport.zoom;
            state.pan = result.viewport.pan;
          }
          state.selectedIds = [];
          state.selectedWorkflowNodeIds = [];
          state.editingTextId = null;
          state.historyPast = [];
          state.historyFuture = [];
        }),
      );

      return result;
    },

    saveLocal: () => {
      const state = get();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pages: state.pages,
          activePageId: state.activePageId,
          zoom: state.zoom,
          pan: state.pan,
          quickToolbarConfig: state.quickToolbarConfig,
          editorMode: state.editorMode,
        }),
      );
    },

    saveRemote: async (url: string) => {
      const targetUrl = resolveApiFetchUrl(url);
      const json = await get().exportProjectJSON();
      const body = JSON.stringify(json);
      logApiEvent("request", `POST ${targetUrl}`, {
        bodyBytes: body.length,
        pages: json.pages?.length,
      });
      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body,
        });
        const text = await res.text();
        logApiEvent("response", `POST ${targetUrl} HTTP ${res.status}`, {
          ok: res.ok,
          bodyHead: text.slice(0, 500),
          bodyLength: text.length,
        });
      } catch (e) {
        logApiEvent("error", `POST ${targetUrl}`, {
          message: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    },

    loadRemote: async (url: string) => {
      const targetUrl = resolveApiFetchUrl(url);
      logApiEvent("request", `GET ${targetUrl}`, {});
      try {
        const res = await fetch(targetUrl);
        const text = await res.text();
        logApiEvent("response", `GET ${targetUrl} HTTP ${res.status}`, {
          ok: res.ok,
          bodyLength: text.length,
        });
        const parsed = JSON.parse(text) as ProjectJSON;
        await get().loadProjectJSON(parsed);
      } catch (e) {
        logApiEvent("error", `GET ${targetUrl}`, {
          message: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    },
  };
}
