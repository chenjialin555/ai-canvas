import { produce } from "immer";
import type { ProjectJSON } from "../../types";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";
import { resolveApiFetchUrl } from "../../../ai/api/client";
import { logApiEvent } from "../../../lib/apiDebug";
import { STORAGE_KEY } from "../constants";
import { clone } from "../helpers/clone";
import { migratePage } from "../helpers/pageMigration";

export function createProjectSlice(set: StoreSet, get: StoreGet) {
  return {
    exportProjectJSON: (): ProjectJSON => {
      const state = get();
      return {
        version: "2.0.0",
        savedAt: new Date().toISOString(),
        pages: clone(state.pages),
        activePageId: state.activePageId,
      };
    },

    loadProjectJSON: (json: ProjectJSON) => {
      if (!json.pages?.length) return;

      get().commitHistory();

      set(
        produce<Store>((state) => {
          state.pages = clone(json.pages).map(migratePage);
          state.activePageId = json.activePageId || json.pages[0]!.id;
          state.selectedIds = [];
          state.editingTextId = null;
          state.historyPast = [];
          state.historyFuture = [];
          state.selectedWorkflowNodeIds = [];
        }),
      );
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
      const json = get().exportProjectJSON();
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
        get().loadProjectJSON(parsed);
      } catch (e) {
        logApiEvent("error", `GET ${targetUrl}`, {
          message: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    },
  };
}
