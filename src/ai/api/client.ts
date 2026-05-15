/**
 * 统一 API 根地址：Web 开发可走相对路径（Vite 代理）；Electron / 生产可配绝对地址。
 */

let apiBaseUrl = "";

export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url.trim().replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

/**
 * @param path 以 `/` 开头的接口路径，例如 `/api/generate-image`
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!apiBaseUrl) return p;
  return `${apiBaseUrl}${p}`;
}

/**
 * 将相对路径解析为完整 URL；已是 http(s) 则原样返回。
 */
export function resolveApiFetchUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return apiUrl(pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`);
}
