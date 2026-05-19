import type { ImageFilter } from "./imageFilter";

/** 用于 Konva cache 依赖的稳定签名（避免 object 引用抖动） */
export function imageFilterRevision(f: ImageFilter): string {
  return [
    f.brightness,
    f.exposure,
    f.contrast,
    f.highlights,
    f.shadows,
    f.whites,
    f.blacks,
    f.vibrance,
    f.saturation,
    f.temperature,
    f.tint,
    f.sharpen,
    f.clarity,
    f.grain,
    f.vignette,
    f.softLight,
    f.glow,
    f.blur,
  ].join(",");
}
