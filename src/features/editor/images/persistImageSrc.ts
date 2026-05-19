import {
  isRemoteImageUrl,
  resolveImageToOssUrl,
} from "../../../shared/lib/resolveImageToOssUrl";

const resolvedCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function needsPersistImageSrc(src: string): boolean {
  const trimmed = src?.trim() ?? "";
  return trimmed.length > 0 && !isRemoteImageUrl(trimmed);
}

/** 将 data: / 本地路径转为 OSS URL；已是 http(s) 则原样返回 */
export async function persistImageSrcToOss(
  src: string,
  options?: { apiName?: string },
): Promise<string> {
  const key = src.trim();
  if (!key || isRemoteImageUrl(key)) return key;

  const cached = resolvedCache.get(key);
  if (cached) return cached;

  let pending = inflight.get(key);
  if (!pending) {
    pending = resolveImageToOssUrl(key, {
      apiName: options?.apiName ?? "canvas-image",
    })
      .then((url) => {
        resolvedCache.set(key, url);
        inflight.delete(key);
        return url;
      })
      .catch((err) => {
        inflight.delete(key);
        throw err;
      });
    inflight.set(key, pending);
  }

  return pending;
}
