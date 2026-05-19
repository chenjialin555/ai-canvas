import type { ProjectJSON } from "../../features/editor/types";

export {};

declare global {
  interface DesktopAPI {
    getApiBaseUrl?: () => string;
    saveProjectFile?: (project: ProjectJSON) => Promise<void>;
    openProjectFile?: () => Promise<ProjectJSON | null>;
  }

  interface Window {
    desktopAPI?: DesktopAPI;
  }
}
