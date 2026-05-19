import {
  DEFAULT_IMAGE_FILTER,
  normalizeImageFilter,
} from "../image-filter/imageFilter";
import { imageFilterRevision } from "../image-filter/filterRevision";
import type { ImageElement } from "../types";

/** 是否必须把图层栅格化后再发给 API（否则可直接用已有 OSS src） */
export function imageElementNeedsApiRender(el: ImageElement): boolean {
  if (el.aiMask?.strokes.length) return true;
  if (el.cropOffsetX || el.cropOffsetY) return true;
  if (el.cropRotation) return true;
  if (el.flipX || el.flipY) return true;
  if (el.cropScale && el.cropScale !== 1) return true;
  if (el.maskShape !== "rect") return true;
  if (el.cornerRadius) return true;
  return (
    imageFilterRevision(normalizeImageFilter(el.filter)) !==
    imageFilterRevision(DEFAULT_IMAGE_FILTER)
  );
}
