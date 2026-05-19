import { setApiBaseUrl } from "../api/client";
import { createDesktopPlatformAdapter } from "./desktop";
import type { PlatformAdapter, PlatformId } from "./types";
import { createWebPlatformAdapter } from "./web";

export type { PlatformAdapter, PlatformCapabilities, PlatformId } from "./types";

let adapter: PlatformAdapter | null = null;

export function detectPlatform(): PlatformId {
  if (typeof window !== "undefined" && window.desktopAPI) {
    return "desktop";
  }
  return "web";
}

/**
 * 必须在首屏请求前调用（见 main.tsx），用于注入 API Base 与平台实现。
 */
export function initPlatform(): PlatformAdapter {
  adapter =
    detectPlatform() === "desktop"
      ? createDesktopPlatformAdapter()
      : createWebPlatformAdapter();
  setApiBaseUrl(adapter.getApiBaseUrl());
  return adapter;
}

export function getPlatform(): PlatformAdapter {
  if (!adapter) {
    return initPlatform();
  }
  return adapter;
}
