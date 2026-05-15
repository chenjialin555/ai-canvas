import type { ProjectJSON } from "../editor/types";
import type { PlatformAdapter } from "./types";

const DESKTOP_CAPS = {
  nativeFileSystem: true,
  localAssetCache: true,
  nativeMenu: true,
  autoUpdate: false,
} as const;

const DEFAULT_LOCAL_API = "http://127.0.0.1:13555";

export function createDesktopPlatformAdapter(): PlatformAdapter {
  return {
    platform: "desktop",
    capabilities: DESKTOP_CAPS,

    getApiBaseUrl() {
      const fromBridge =
        typeof window !== "undefined"
          ? window.desktopAPI?.getApiBaseUrl?.()
          : undefined;
      if (typeof fromBridge === "string" && fromBridge.trim()) {
        return fromBridge.trim().replace(/\/$/, "");
      }
      const raw = import.meta.env.VITE_API_BASE_URL;
      if (typeof raw === "string" && raw.trim()) {
        return raw.trim().replace(/\/$/, "");
      }
      return DEFAULT_LOCAL_API;
    },

    async saveProjectFile(project: ProjectJSON) {
      const fn = window.desktopAPI?.saveProjectFile;
      if (fn) {
        await fn(project);
        return;
      }
      const blob = new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project.aicanvas.json";
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    },

    async openProjectFile() {
      const fn = window.desktopAPI?.openProjectFile;
      if (!fn) return null;
      return fn();
    },
  };
}
