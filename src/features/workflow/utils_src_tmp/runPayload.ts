import { exportImageMaskToDataURL } from "../../image-tools/mask/maskRasterize";
import type { ImageElement, Page } from "../../editor/types";
import { resolveAiNodeInputs } from "./unifiedGraph";

/**
 * 将 resolveAiNodeInputs 的结果转为后端可 JSON 序列化的载荷（蒙版从 elementId 导出为 dataURL）。
 */
export function serializeWorkflowInputsForApi(
  nodeId: string,
  page: Page,
): Record<string, unknown> {
  const raw = resolveAiNodeInputs(nodeId, page);
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(raw)) {
    if (
      val &&
      typeof val === "object" &&
      (val as { type?: string }).type === "mask" &&
      "elementId" in (val as { elementId?: string })
    ) {
      const elId = (val as { elementId: string }).elementId;
      const el = page.elements.find((e) => e.id === elId) as ImageElement | undefined;
      if (el?.type === "image" && el.aiMask) {
        const url = exportImageMaskToDataURL(el);
        if (url) {
          out[key] = {
            type: "mask",
            url,
            width: el.aiMask.width,
            height: el.aiMask.height,
          };
          continue;
        }
      }
    }
    out[key] = val;
  }
  return out;
}
