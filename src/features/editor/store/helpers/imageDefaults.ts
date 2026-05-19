import { nanoid } from "nanoid";
import { computeImageFrameSize } from "../../../../shared/lib/aiImageLayout";
import { DEFAULT_IMAGE_FILTER } from "../../image-filter/imageFilter";
import type { ImageElement } from "../../types";

const DEFAULT_IMAGE_FRAME = computeImageFrameSize(16, 9);

export const fallback = {
  ref1: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1400",
  ref2: "https://images.unsplash.com/photo-1520509414578-d9cbf09933a1?w=1200",
  room1: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400",
  room2: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400",
  ui1: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200",
  ui2: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200",
};

export function getImageDefaults(): Pick<
  ImageElement,
  | "cropOffsetX"
  | "cropOffsetY"
  | "cropScale"
  | "cropRotation"
  | "flipX"
  | "flipY"
  | "cornerRadius"
  | "maskShape"
  | "filter"
  | "aiMask"
> {
  return {
    cropOffsetX: 0,
    cropOffsetY: 0,
    cropScale: 1,
    cropRotation: 0,
    flipX: false,
    flipY: false,
    cornerRadius: 0,
    maskShape: "rect",
    filter: { ...DEFAULT_IMAGE_FILTER },
    aiMask: null,
  };
}

export function makeImage(src: string, name = "图片"): ImageElement {
  return {
    id: nanoid(),
    type: "image",
    name,
    x: 420,
    y: 320,
    width: DEFAULT_IMAGE_FRAME.width,
    height: DEFAULT_IMAGE_FRAME.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    src,
    ...getImageDefaults(),
  };
}
