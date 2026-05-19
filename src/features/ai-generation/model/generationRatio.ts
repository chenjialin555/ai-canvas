/** 与 AiGenerateModal / 后端 `ASPECT_RATIOS` 一致的可选比例 */
export const GENERATION_ASPECT_RATIOS = [
  "1x1",
  "2x3",
  "3x2",
  "4x5",
  "5x4",
  "16x9",
  "9x16",
  "21x9",
] as const;

export type GenerationAspectRatio = (typeof GENERATION_ASPECT_RATIOS)[number];

export const GENERATION_RATIO_AUTO = "auto" as const;

export type GenerationRatioChoice =
  | GenerationAspectRatio
  | typeof GENERATION_RATIO_AUTO;

export function parseAspectRatioValue(ratio: string): number {
  const parts = ratio.toLowerCase().split("x");
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) return 1;
  return w / h;
}

/** 按宽高数值，在预设比例中选最接近的一项 */
export function pickClosestGenerationRatio(
  width: number,
  height: number,
): GenerationAspectRatio {
  if (width <= 0 || height <= 0) return "16x9";

  const imageRatio = width / height;
  let minDiff = Number.POSITIVE_INFINITY;
  let closest: GenerationAspectRatio = GENERATION_ASPECT_RATIOS[0];

  for (const candidate of GENERATION_ASPECT_RATIOS) {
    const diff = Math.abs(imageRatio - parseAspectRatioValue(candidate));
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }

  return closest;
}

export type RatioSizeSource = {
  width: number;
  height: number;
};

/**
 * 将 UI 中的 ratio（含 `auto`）解析为发给 API 的具体比例。
 * 无参考图时 `auto` 回退为 `16x9`。
 */
export function resolveGenerationRatio(
  ratio: string,
  source: RatioSizeSource | null | undefined,
  fallback: GenerationAspectRatio = "16x9",
): GenerationAspectRatio {
  const normalized = ratio.trim().toLowerCase();
  if (normalized !== GENERATION_RATIO_AUTO) {
    const match = GENERATION_ASPECT_RATIOS.find((r) => r === normalized);
    return match ?? fallback;
  }
  if (!source?.width || !source?.height) return fallback;
  return pickClosestGenerationRatio(source.width, source.height);
}
