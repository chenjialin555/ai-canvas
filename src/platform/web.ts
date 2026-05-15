import type { ProjectJSON } from "../editor/types";
import type { PlatformAdapter } from "./types";

const WEB_CAPS = {
  nativeFileSystem: false,
  localAssetCache: false,
  nativeMenu: false,
  autoUpdate: false,
} as const;

export function createWebPlatformAdapter(): PlatformAdapter {
  return {
    platform: "web",
    capabilities: WEB_CAPS,

    getApiBaseUrl() {
      const raw = import.meta.env.VITE_API_BASE_URL;
      if (typeof raw === "string" && raw.trim()) {
        return raw.trim().replace(/\/$/, "");
      }
      return "";
    },

    async saveProjectFile(project: ProjectJSON) {
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
      return null;
    },
  };
}
