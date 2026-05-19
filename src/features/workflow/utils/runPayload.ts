import type { ImageElement, Page } from "../../../features/editor/types";
import {
  prepareImageElementForApi,
  type PreparedImageElementForApi,
} from "../../../features/editor/export/prepareImageElementForApi";
import { getWorkflowNodeDefinition } from "../model/nodeRegistry";
import { resolveAiNodeInputs } from "./unifiedGraph";

/**
 * 将 resolveAiNodeInputs 的结果转为后端可 JSON 序列化的载荷。
 * 图片输入使用画布渲染结果（裁剪 + 滤镜）；蒙版与渲染图同像素尺寸。
 */
export async function serializeWorkflowInputsForApi(
  nodeId: string,
  page: Page,
): Promise<Record<string, unknown>> {
  const raw = resolveAiNodeInputs(nodeId, page);
  const node = page.aiNodes.find((n) => n.id === nodeId);
  if (!node) return raw;

  const def = getWorkflowNodeDefinition(node.type);
  const out: Record<string, unknown> = {};
  const preparedByElementId = new Map<string, PreparedImageElementForApi>();

  async function getPrepared(el: ImageElement) {
    let cached = preparedByElementId.get(el.id);
    if (!cached) {
      cached = await prepareImageElementForApi(el, { apiName: "workflow-input" });
      preparedByElementId.set(el.id, cached);
    }
    return cached;
  }

  for (const input of def.inputs) {
    const key = input.name;
    const val = raw[key];
    if (val === undefined) continue;

    const edge = page.edges.find(
      (e) =>
        e.to.kind === "ai-node" &&
        e.to.nodeId === nodeId &&
        e.to.portId === input.id,
    );

    if (
      edge?.from.kind === "image-element" &&
      edge.from.portId === "image"
    ) {
      const from = edge.from;
      const el = page.elements.find((e) => e.id === from.elementId) as
        | ImageElement
        | undefined;
      if (el?.type === "image") {
        const p = await getPrepared(el);
        out[key] = {
          type: "image",
          url: p.imageUrl,
          width: p.width,
          height: p.height,
        };
        continue;
      }
    }

    if (
      val &&
      typeof val === "object" &&
      (val as { type?: string }).type === "mask" &&
      "elementId" in (val as { elementId?: string })
    ) {
      const elId = (val as { elementId: string }).elementId;
      const el = page.elements.find((e) => e.id === elId) as ImageElement | undefined;
      if (el?.type === "image" && el.aiMask) {
        const p = await getPrepared(el);
        if (p.maskDataURL) {
          out[key] = {
            type: "mask",
            url: p.maskDataURL,
            width: p.width,
            height: p.height,
          };
          continue;
        }
      }
    }

    out[key] = val;
  }

  return out;
}
