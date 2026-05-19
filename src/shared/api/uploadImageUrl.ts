import { nanoid } from "nanoid";
import { resolveApiFetchUrl } from "./client";

export type UploadImageUrlRequest = {
  dataUrl: string;
  traceId?: string;
  clientId?: string;
  apiName?: string;
};

export async function uploadImageUrlToOss(
  dataUrl: string,
  meta?: Omit<UploadImageUrlRequest, "dataUrl">,
): Promise<string> {
  const res = await fetch(resolveApiFetchUrl("/api/upload-image-url"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataUrl,
      traceId: meta?.traceId ?? nanoid(),
      clientId: meta?.clientId ?? "web",
      apiName: meta?.apiName ?? "image-upload",
    } satisfies UploadImageUrlRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `上传图片失败 HTTP ${res.status}，请检查 OSS 配置`,
    );
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("上传成功但未返回 url");
  return data.url;
}
