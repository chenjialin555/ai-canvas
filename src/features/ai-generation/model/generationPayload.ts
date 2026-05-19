import { nanoid } from "nanoid";
import type { CanvasElement } from "../../../features/editor/types";
import type { ImageProvider } from "./generationTypes";
import type { GenerationAspectRatio } from "./generationRatio";

export type ModalGenerationFormFields = {
  provider: ImageProvider;
  model: string;
  prompt: string;
  ratio: string;
  resolution: string;
  watermark: boolean;
  size: string;
  seed: string;
  guidanceScale: string;
};

/**
 * 单步弹窗「生成」请求体（与原先 `AiGenerateModal` 内联字段一致）。
 */
export type PreparedGenerationImage = {
  imageUrl: string | null;
  maskDataURL: string | null;
};

export function buildModalGenerateImagePayload(
  form: ModalGenerationFormFields,
  selected: CanvasElement | undefined,
  prepared: PreparedGenerationImage | null,
  resolvedRatio: GenerationAspectRatio,
): { payload: Record<string, unknown>; traceId: string } {
  const traceId = nanoid();

  const sourceImage =
    prepared?.imageUrl ??
    (selected?.type === "image" ? selected.src : null);
  const maskDataURL = prepared?.maskDataURL ?? null;

  const mode = maskDataURL
    ? "inpaint"
    : sourceImage
      ? "image-to-image"
      : "generate";

  const payload: Record<string, unknown> = {
    provider: form.provider,
    model: form.model,
    prompt: form.prompt.trim(),
    image: sourceImage ?? undefined,
    mask: maskDataURL ?? undefined,
    mode,
    ratio: resolvedRatio,
    resolution: form.resolution,
    watermark: form.watermark,
    traceId,
    clientId: "web",
  };
  if (form.size.trim()) payload.size = form.size.trim();
  if (form.seed.trim()) payload.seed = Number(form.seed.trim());
  if (form.guidanceScale.trim()) {
    payload.guidanceScale = Number(form.guidanceScale.trim());
  }

  return { payload, traceId };
}
