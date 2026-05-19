import Konva from "konva";
import type { Filter } from "konva/lib/Node";

/** 图片调整参数（快捷条「调整」面板与右侧滤镜共用） */
export type ImageFilter = {
  /** 光线 */
  brightness: number;
  /** 曝光 */
  exposure: number;
  /** 对比度 */
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  /** 自然饱和度 */
  vibrance: number;
  /** 饱和度 */
  saturation: number;
  /** 色温：负=冷，正=暖 */
  temperature: number;
  /** 色调：负=绿，正=洋红 */
  tint: number;
  sharpen: number;
  clarity: number;
  grain: number;
  vignette: number;
  softLight: number;
  glow: number;
  blur: number;
};

export type ImageFilterKey = keyof ImageFilter;

export const DEFAULT_IMAGE_FILTER: ImageFilter = {
  brightness: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vibrance: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  sharpen: 0,
  clarity: 0,
  grain: 0,
  vignette: 0,
  softLight: 0,
  glow: 0,
  blur: 0,
};

export const AUTO_ENHANCE_FILTER: ImageFilter = {
  ...DEFAULT_IMAGE_FILTER,
  brightness: 6,
  exposure: 10,
  contrast: 14,
  shadows: 12,
  vibrance: 18,
  saturation: 8,
  clarity: 10,
};

/** 合并旧工程里仅含 4 项滤镜的数据 */
export function normalizeImageFilter(raw: unknown): ImageFilter {
  const base = { ...DEFAULT_IMAGE_FILTER };
  if (!raw || typeof raw !== "object") return base;

  const r = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_IMAGE_FILTER) as ImageFilterKey[]) {
    const v = r[key];
    if (typeof v !== "number" || Number.isNaN(v)) continue;
    base[key] = v;
  }

  if (
    r.saturation !== undefined &&
    Math.abs(base.saturation) <= 2 &&
    base.vibrance === 0
  ) {
    base.saturation = Math.round(base.saturation * 50);
  }
  if (
    r.brightness !== undefined &&
    Math.abs(base.brightness) <= 1 &&
    base.exposure === 0
  ) {
    base.brightness = Math.round(base.brightness * 100);
  }

  return base;
}

export type KonvaImageFilterProps = {
  filters: Filter[];
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  blurRadius?: number;
  noise?: number;
  hasFilters: boolean;
};

export function getKonvaImageFilterProps(filter: ImageFilter): KonvaImageFilterProps {
  const f = normalizeImageFilter(filter);
  const filters: Filter[] = [];

  const brighten =
    f.brightness / 100 +
    f.exposure / 120 +
    f.highlights / 400 +
    f.shadows / 350 +
    f.whites / 500 -
    f.blacks / 500 +
    f.softLight / 250 +
    f.glow / 300;

  const contrast =
    f.contrast + f.clarity * 0.35 + f.sharpen * 0.2 + f.whites * 0.08 - f.blacks * 0.08;

  const saturation = (f.saturation + f.vibrance * 0.65) / 50;

  const hue = f.temperature * 0.45 + f.tint * 0.35;

  const blurRadius = Math.min(30, f.blur / 3 + f.glow / 25);

  const noise = f.grain > 0 ? Math.min(1, f.grain / 80) : 0;

  if (brighten !== 0) filters.push(Konva.Filters.Brighten);
  if (contrast !== 0) filters.push(Konva.Filters.Contrast);
  if (saturation !== 0 || hue !== 0) filters.push(Konva.Filters.HSV);
  if (blurRadius > 0) filters.push(Konva.Filters.Blur);
  if (noise > 0) filters.push(Konva.Filters.Noise);

  return {
    filters,
    brightness: brighten !== 0 ? brighten : undefined,
    contrast: contrast !== 0 ? contrast : undefined,
    saturation: saturation !== 0 ? saturation : undefined,
    hue: hue !== 0 ? hue : undefined,
    blurRadius: blurRadius > 0 ? blurRadius : undefined,
    noise: noise > 0 ? noise : undefined,
    hasFilters: filters.length > 0,
  };
}

export function toCssCanvasFilter(filter: ImageFilter): string {
  const f = normalizeImageFilter(filter);
  const brightness =
    100 +
    f.brightness +
    f.exposure * 0.8 +
    f.highlights * 0.25 +
    f.shadows * 0.2 +
    f.softLight * 0.3 +
    f.glow * 0.35;
  const contrast =
    100 + f.contrast + f.clarity * 0.35 + f.sharpen * 0.15 + f.whites * 0.1 - f.blacks * 0.1;
  const saturate = 100 + f.saturation + f.vibrance * 0.6;
  const blur = Math.min(30, f.blur / 3 + f.glow / 25);
  const hue = f.temperature * 0.45 + f.tint * 0.35;
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) blur(${blur}px) hue-rotate(${hue}deg)`;
}
