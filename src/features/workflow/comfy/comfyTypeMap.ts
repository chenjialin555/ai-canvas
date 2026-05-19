import { WORKFLOW_NODE_REGISTRY } from "../model/nodeRegistry";

/** 画布图片元素 → Comfy 节点（导出时 src 会先上传 OSS 得到 URL） */
export const COMFY_TYPE_IMAGE_SOURCE = "AiCanvas.ImageSource";

/** 画布图片 AI 蒙版 → Comfy 节点 */
export const COMFY_TYPE_MASK_SOURCE = "AiCanvas.MaskSource";

/** 外部 Comfy 工作流里常见、本应用不原生执行的节点 */
export const COMFY_TYPE_UNKNOWN = "AiCanvas.UnknownNode";

const CANVAS_TO_COMFY: Record<string, string> = {
  inpaint: "AiCanvas.Inpaint",
  "style-transfer": "AiCanvas.StyleTransfer",
  outpaint: "AiCanvas.Outpaint",
  upscale: "AiCanvas.Upscale",
  "output-view": "AiCanvas.OutputView",
  "comfy-bridge": COMFY_TYPE_UNKNOWN,
};

const COMFY_TO_CANVAS: Record<string, string> = {
  [COMFY_TYPE_IMAGE_SOURCE]: "__image_source__",
  [COMFY_TYPE_MASK_SOURCE]: "__mask_source__",
  [COMFY_TYPE_UNKNOWN]: "comfy-bridge",
  "AiCanvas.Inpaint": "inpaint",
  "AiCanvas.StyleTransfer": "style-transfer",
  "AiCanvas.Outpaint": "outpaint",
  "AiCanvas.Upscale": "upscale",
  "AiCanvas.OutputView": "output-view",
};

/** 与 registry 保持一致，避免手写漏项 */
for (const type of Object.keys(WORKFLOW_NODE_REGISTRY)) {
  if (type === "comfy-bridge") continue;
  if (!CANVAS_TO_COMFY[type]) {
    const comfy =
      "AiCanvas." +
      type
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
    CANVAS_TO_COMFY[type] = comfy;
    COMFY_TO_CANVAS[comfy] = type;
  }
}

export function canvasTypeToComfyType(
  canvasType: string,
  comfyTypeOverride?: string,
): string {
  if (comfyTypeOverride && comfyTypeOverride.length > 0) {
    return comfyTypeOverride;
  }
  return CANVAS_TO_COMFY[canvasType] ?? COMFY_TYPE_UNKNOWN;
}

export function comfyTypeToCanvasType(comfyType: string): string {
  return COMFY_TO_CANVAS[comfyType] ?? "comfy-bridge";
}

export function isImageSourceComfyType(type: string): boolean {
  return type === COMFY_TYPE_IMAGE_SOURCE;
}

export function isMaskSourceComfyType(type: string): boolean {
  return type === COMFY_TYPE_MASK_SOURCE;
}

export function listNativeComfyTypes(): string[] {
  return Object.values(CANVAS_TO_COMFY).filter(
    (t) => t !== COMFY_TYPE_UNKNOWN,
  );
}
