import { exportImageMaskToDataURLAtSize } from "../../image-tools/mask/maskRasterize";
import { uploadImageUrlToOss } from "../../../shared/api/uploadImageUrl";
import { isRemoteImageUrl } from "../../../shared/lib/resolveImageToOssUrl";
import { yieldToMain } from "../../../shared/lib/yieldToMain";
import type { ImageElement } from "../types";
import { imageElementNeedsApiRender } from "./imageElementNeedsApiRender";
import { renderImageElementToDataURL } from "./renderImageElement";

export type PreparedImageElementForApi = {
  /** 发给后端的原图 URL（裁剪+滤镜后的合成图，或已有 OSS） */
  imageUrl: string;
  /** 蒙版公网 URL（已上传 OSS），无蒙版时为 null */
  maskDataURL: string | null;
  width: number;
  height: number;
};

export type PrepareImagePhase = "render" | "upload" | "done";

/**
 * 将画布图片图层导出为与屏幕一致的位图，并上传 OSS 供生成/工作流 API 使用。
 */
export async function prepareImageElementForApi(
  el: ImageElement,
  meta?: { apiName?: string; onPhase?: (phase: PrepareImagePhase) => void },
): Promise<PreparedImageElementForApi> {
  let imageUrl = el.src;
  let width = el.width;
  let height = el.height;

  const needsRender = imageElementNeedsApiRender(el);

  if (needsRender) {
    meta?.onPhase?.("render");
    await yieldToMain();

    const rendered = await renderImageElementToDataURL(el, "image/jpeg", {
      forApi: true,
    });

    if (rendered) {
      width = rendered.size.pixelWidth;
      height = rendered.size.pixelHeight;
      meta?.onPhase?.("upload");
      await yieldToMain();

      if (isRemoteImageUrl(rendered.dataUrl)) {
        imageUrl = rendered.dataUrl;
      } else {
        imageUrl = await uploadImageUrlToOss(rendered.dataUrl, {
          apiName: meta?.apiName ?? "canvas-render",
          clientId: "web",
        });
      }
    }
  } else if (isRemoteImageUrl(el.src)) {
    imageUrl = el.src;
  }

  let maskDataURL: string | null = null;
  if (el.aiMask?.strokes.length) {
    await yieldToMain();
    const maskRaw = await exportImageMaskToDataURLAtSize(el, width, height);
    if (maskRaw) {
      meta?.onPhase?.("upload");
      maskDataURL = await uploadImageUrlToOss(maskRaw, {
        apiName: "generate-mask",
        clientId: "web",
      });
    }
  }

  meta?.onPhase?.("done");
  return { imageUrl, maskDataURL, width, height };
}
