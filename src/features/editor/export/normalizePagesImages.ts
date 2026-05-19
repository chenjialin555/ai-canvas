import { asyncPool } from "../../../shared/lib/asyncPool";
import {
  isRemoteImageUrl,
  resolveImageToOssUrl,
} from "../../../shared/lib/resolveImageToOssUrl";
import type { Page } from "../types";
import { clone } from "../store/helpers/clone";

const UPLOAD_CONCURRENCY = 4;

type ImageRef = { set: (url: string) => void; get: () => string };

/** 导入/导出 JSON 前：把 data: 与本地图片规范为 OSS URL，减轻内存与卡顿 */
export async function normalizePagesImagesToUrls(
  pages: Page[],
  options?: { clone?: boolean; apiName?: string },
): Promise<Page[]> {
  const copy = options?.clone === false ? pages : clone(pages);
  const urlCache = new Map<string, string>();
  const apiName = options?.apiName ?? "project-json";

  async function toOssUrl(src: string): Promise<string> {
    const key = src.trim();
    if (!key || isRemoteImageUrl(key)) return key;
    const cached = urlCache.get(key);
    if (cached) return cached;
    const url = await resolveImageToOssUrl(key, { apiName });
    urlCache.set(key, url);
    return url;
  }

  const refs: ImageRef[] = [];

  for (const page of copy) {
    for (const el of page.elements) {
      if (el.type === "image" && el.src && !isRemoteImageUrl(el.src)) {
        refs.push({
          get: () => el.src,
          set: (url) => {
            el.src = url;
          },
        });
      }
    }
    for (const node of page.aiNodes) {
      for (const key of Object.keys(node.outputs)) {
        const v = node.outputs[key];
        if (
          !v ||
          (v.type !== "image" && v.type !== "mask") ||
          typeof v.url !== "string" ||
          !v.url ||
          isRemoteImageUrl(v.url)
        ) {
          continue;
        }
        refs.push({
          get: () => v.url,
          set: (url) => {
            node.outputs[key] = { ...v, url };
          },
        });
      }
    }
  }

  await asyncPool(refs, UPLOAD_CONCURRENCY, async (ref) => {
    const url = await toOssUrl(ref.get());
    ref.set(url);
  });

  return copy;
}
