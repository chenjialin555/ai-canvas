import type { ImageElement } from "../../editor/types";

export const CROP_FRAME_MIN_SIZE = 40;
export const CROP_SCALE_MIN = 0.2;
export const CROP_SCALE_MAX = 5;

export type CropEdge = "left" | "right" | "top" | "bottom";

export type CropEditorFrame = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type CropFramePatch = Pick<
  ImageElement,
  | "x"
  | "y"
  | "width"
  | "height"
  | "cropOffsetX"
  | "cropOffsetY"
>;

/** 裁剪弹窗内将元素外框适配到可视编辑区 */
export function computeCropEditorFrame(
  elementWidth: number,
  elementHeight: number,
  editorWidth: number,
  editorHeight: number,
  padding = 48,
  maxScale = 2,
): CropEditorFrame {
  const maxW = editorWidth - padding;
  const maxH = editorHeight - padding;
  const scale = Math.min(
    maxW / elementWidth,
    maxH / elementHeight,
    maxScale,
  );
  const w = elementWidth * scale;
  const h = elementHeight * scale;
  return {
    offsetX: (editorWidth - w) / 2,
    offsetY: (editorHeight - h) / 2,
    scale,
  };
}

/** cover 模式：图片铺满裁剪框所需的基础缩放 */
export function computeCoverImageBaseScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0) return 1;
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function computeCropImageDisplayScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  cropScale = 1,
): number {
  return computeCoverImageBaseScale(
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
  ) * cropScale;
}

/** 滚轮调整 cropScale，带上下限 */
export function adjustCropScaleFromWheel(
  currentScale: number,
  deltaY: number,
  step = 0.05,
): number {
  const delta = deltaY > 0 ? -step : step;
  const next = Math.min(
    CROP_SCALE_MAX,
    Math.max(CROP_SCALE_MIN, currentScale + delta),
  );
  return Number(next.toFixed(2));
}

/** 拖动边柄时更新外框与 cropOffset（保持图片相对框居中补偿） */
export function applyCropEdgeDrag(
  element: ImageElement,
  edge: CropEdge,
  dx: number,
  dy: number,
): CropFramePatch {
  let nextX = element.x;
  let nextY = element.y;
  let nextW = element.width;
  let nextH = element.height;
  let nextCropOffsetX = element.cropOffsetX || 0;
  let nextCropOffsetY = element.cropOffsetY || 0;

  if (edge === "left") {
    nextX = element.x + dx;
    nextW = element.width - dx;
    nextCropOffsetX = (element.cropOffsetX || 0) - dx / 2;
  } else if (edge === "right") {
    nextW = element.width + dx;
    nextCropOffsetX = (element.cropOffsetX || 0) - dx / 2;
  } else if (edge === "top") {
    nextY = element.y + dy;
    nextH = element.height - dy;
    nextCropOffsetY = (element.cropOffsetY || 0) - dy / 2;
  } else if (edge === "bottom") {
    nextH = element.height + dy;
    nextCropOffsetY = (element.cropOffsetY || 0) - dy / 2;
  }

  nextW = Math.max(CROP_FRAME_MIN_SIZE, nextW);
  nextH = Math.max(CROP_FRAME_MIN_SIZE, nextH);

  return {
    x: Math.round(nextX),
    y: Math.round(nextY),
    width: Math.round(nextW),
    height: Math.round(nextH),
    cropOffsetX: Math.round(nextCropOffsetX),
    cropOffsetY: Math.round(nextCropOffsetY),
  };
}

/** Konva 拖拽图片后换算 cropOffset */
export function cropOffsetFromImageCenter(
  frameWidth: number,
  frameHeight: number,
  imageCenterX: number,
  imageCenterY: number,
): Pick<ImageElement, "cropOffsetX" | "cropOffsetY"> {
  return {
    cropOffsetX: Math.round(imageCenterX - frameWidth / 2),
    cropOffsetY: Math.round(imageCenterY - frameHeight / 2),
  };
}
