import type { Page } from "../../editor/types";
import type { ImageElement } from "../../editor/types";
import type { NodeEdge } from "../model/types";
import {
  COMFY_TYPE_IMAGE_SOURCE,
  COMFY_TYPE_MASK_SOURCE,
} from "./comfyTypeMap";
import type { ComfyWorkflowNode } from "./comfyWorkflowTypes";
import { prepareImageElementForApi } from "../../editor/export/prepareImageElementForApi";
import { resolveImageSrcForComfyExport } from "./resolveImageForComfy";

const IMAGE_SOURCE_W = 240;
const IMAGE_SOURCE_H = 120;

export type ImageSourceExportPlan = {
  element: ImageElement;
  edge: NodeEdge;
  ossUrl: string;
  maskOssUrl?: string;
};

export async function planCanvasImageExports(
  page: Page,
): Promise<ImageSourceExportPlan[]> {
  const plans: ImageSourceExportPlan[] = [];

  for (const edge of page.edges) {
    const from = edge.from;
    if (from.kind !== "image-element" || edge.to.kind !== "ai-node") continue;
    const el = page.elements.find((e) => e.id === from.elementId);
    if (!el || el.type !== "image") continue;

    const prepared = await prepareImageElementForApi(el, { apiName: "comfy-export" });

    if (from.portId === "image") {
      plans.push({ element: el, edge, ossUrl: prepared.imageUrl });
      continue;
    }

    if (from.portId === "mask") {
      let maskOssUrl: string | undefined;
      if (prepared.maskDataURL) {
        maskOssUrl = await resolveImageSrcForComfyExport(prepared.maskDataURL);
      }
      plans.push({
        element: el,
        edge,
        ossUrl: prepared.imageUrl,
        maskOssUrl,
      });
    }
  }

  return plans;
}

export function buildImageSourceComfyNode(
  comfyId: number,
  plan: ImageSourceExportPlan,
  order: number,
  outputLinkId: number | null,
): ComfyWorkflowNode {
  const el = plan.element;
  const from = plan.edge.from;
  const portId = from.kind === "image-element" ? from.portId : "image";

  return {
    id: comfyId,
    type: portId === "mask" ? COMFY_TYPE_MASK_SOURCE : COMFY_TYPE_IMAGE_SOURCE,
    pos: [el.x - IMAGE_SOURCE_W - 40, el.y],
    size: [IMAGE_SOURCE_W, IMAGE_SOURCE_H],
    flags: {},
    order,
    mode: 0,
    inputs: [],
    outputs: [
      {
        name: portId === "mask" ? "MASK" : "IMAGE",
        type: portId === "mask" ? "MASK" : "IMAGE",
        links: outputLinkId != null ? [outputLinkId] : null,
      },
    ],
    properties: {
      widget_ue_connectable: {},
      "Node name for S&R":
        portId === "mask" ? "AiCanvas 蒙版" : "AiCanvas 图片",
      "ai-canvas": {
        role: portId === "mask" ? "mask-source" : "image-source",
        elementId: el.id,
        portId,
        elementName: el.name,
      },
    },
    widgets_values:
      portId === "mask"
        ? [plan.maskOssUrl ?? plan.ossUrl]
        : [plan.ossUrl, "image"],
  };
}
