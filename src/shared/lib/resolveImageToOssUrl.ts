import { uploadImageUrlToOss } from "../api/uploadImageUrl";

/** 已是可访问的 http(s) URL（含 OSS）则直接使用 */
export function isRemoteImageUrl(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}

async function fetchAsDataUrl(src: string): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`无法读取图片：${src}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`读取图片失败：${src}`));
    reader.readAsDataURL(blob);
  });
}

/**
 * 将画布图片 src 规范为 OSS（或公网）URL。
 * - http(s)：原样返回
 * - data: / 本地路径 / 相对 assets：先转 dataUrl 再 POST /api/upload-image-url
 */
export async function resolveImageToOssUrl(
  src: string,
  meta?: { apiName?: string },
): Promise<string> {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) throw new Error("图片地址为空");
  if (isRemoteImageUrl(trimmed)) return trimmed;

  let dataUrl = trimmed;
  if (!trimmed.startsWith("data:")) {
    dataUrl = await fetchAsDataUrl(trimmed);
  }

  return uploadImageUrlToOss(dataUrl, {
    apiName: meta?.apiName ?? "image-upload",
  });
}
