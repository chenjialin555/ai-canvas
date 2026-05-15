import type { ProjectJSON } from "../editor/types";

export type PlatformId = "web" | "desktop";

export type PlatformCapabilities = {
  nativeFileSystem: boolean;
  localAssetCache: boolean;
  nativeMenu: boolean;
  autoUpdate: boolean;
};

/**
 * Web / 桌面差异集中在此；编辑器内应通过 getPlatform() 调用，避免直接写死 Electron 或 window.location。
 */
export type PlatformAdapter = {
  platform: PlatformId;
  capabilities: PlatformCapabilities;

  /** 不含末尾 `/`；空字符串表示走相对路径（浏览器同源或 Vite 开发代理） */
  getApiBaseUrl: () => string;

  /** 导出工程 JSON（Web 默认触发下载） */
  saveProjectFile?: (project: ProjectJSON) => Promise<void>;

  /** 打开工程 JSON（Web 侧一般由隐藏 file input 完成，此处可返回 null） */
  openProjectFile?: () => Promise<ProjectJSON | null>;
};
