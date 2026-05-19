import { nanoid } from "nanoid";
import type { Page } from "../../editor/types";
import { getWorkflowNodeDefinition } from "../model/nodeRegistry";
import { buildComfyBridgeDefinition } from "./buildComfyBridgeDefinition";
import {
  buildImageSourceComfyNode,
  planCanvasImageExports,
} from "./comfyImageNodes";
import {
  AI_NODE_MIN_HEIGHT,
  AI_NODE_MIN_WIDTH,
} from "../model/nodeLayout";
import type { NodeEdge, WorkflowNode } from "../model/types";
import { canvasTypeToComfyType } from "./comfyTypeMap";
import type {
  AiCanvasComfyExtra,
  ComfyWorkflowJSON,
  ComfyWorkflowLink,
  ComfyWorkflowNode,
  ComfyWorkflowNodeInput,
  ComfyWorkflowNodeOutput,
} from "./comfyWorkflowTypes";

function toComfySlotType(dataType: string): string {
  const m: Record<string, string> = {
    image: "IMAGE",
    mask: "MASK",
    text: "STRING",
    number: "FLOAT",
    boolean: "BOOLEAN",
    json: "JSON",
  };
  return m[dataType] ?? dataType.toUpperCase();
}

function resolveDef(node: WorkflowNode) {
  if (node.type === "comfy-bridge") return buildComfyBridgeDefinition(node);
  return getWorkflowNodeDefinition(node.type);
}

function paramsToWidgetsValues(
  node: WorkflowNode,
  def: ReturnType<typeof getWorkflowNodeDefinition>,
): unknown[] {
  if (node.type === "comfy-bridge") {
    const w = node.params._comfyWidgets;
    return Array.isArray(w) ? [...w] : [];
  }
  return def.params.map((p) => node.params[p.id] ?? p.defaultValue ?? "");
}

function isAiToAiEdge(edge: NodeEdge): boolean {
  return edge.from.kind === "ai-node" && edge.to.kind === "ai-node";
}

export type ExportComfyOptions = {
  viewport?: { zoom: number; pan: { x: number; y: number } };
  /** 是否将 data: / 本地图上传 OSS（默认 true） */
  uploadImagesToOss?: boolean;
};

/**
 * 导出当前页为 ComfyUI API 工作流 JSON。
 * 画布图片通过 AiCanvas.ImageSource / MaskSource 节点输出 OSS URL，再连到 AI 节点输入。
 */
export async function exportComfyWorkflow(
  page: Page,
  options?: ExportComfyOptions,
): Promise<ComfyWorkflowJSON> {
  const uploadImages = options?.uploadImagesToOss !== false;

  const imagePlans = uploadImages
    ? await planCanvasImageExports(page)
    : [];

  const sortedAi = [...page.aiNodes].sort((a, b) => a.createdAt - b.createdAt);

  const canvasIdToComfyId = new Map<string, number>();
  let nextComfyId = 1;

  const imageSourceComfyIds = new Map<string, number>();
  for (const plan of imagePlans) {
    const key = `${plan.element.id}:${plan.edge.from.portId}`;
    imageSourceComfyIds.set(key, nextComfyId++);
  }

  for (const n of sortedAi) {
    canvasIdToComfyId.set(n.id, nextComfyId++);
  }

  const nodeByCanvasId = new Map(sortedAi.map((n) => [n.id, n]));
  const links: ComfyWorkflowLink[] = [];
  let linkId = 1;

  function addLink(
    fromComfy: number,
    fromSlot: number,
    toComfy: number,
    toSlot: number,
    dataType: string,
  ) {
    links.push([linkId++, fromComfy, fromSlot, toComfy, toSlot, dataType]);
    return linkId - 1;
  }

  for (const plan of imagePlans) {
    const key = `${plan.element.id}:${plan.edge.from.portId}`;
    const sourceComfyId = imageSourceComfyIds.get(key)!;
    const toNode = nodeByCanvasId.get(
      plan.edge.to.kind === "ai-node" ? plan.edge.to.nodeId : "",
    );
    if (!toNode) continue;
    const toComfy = canvasIdToComfyId.get(toNode.id);
    if (toComfy == null) continue;

    let toDef: ReturnType<typeof getWorkflowNodeDefinition>;
    try {
      toDef = resolveDef(toNode);
    } catch {
      continue;
    }
    const toSlot = toDef.inputs.findIndex((i) => i.id === plan.edge.to.portId);
    if (toSlot < 0) continue;

    addLink(sourceComfyId, 0, toComfy, toSlot, toComfySlotType(plan.edge.dataType));
  }

  const aiEdges = page.edges.filter(isAiToAiEdge);
  for (const edge of aiEdges) {
    if (edge.from.kind !== "ai-node" || edge.to.kind !== "ai-node") continue;
    const fromNode = nodeByCanvasId.get(edge.from.nodeId);
    const toNode = nodeByCanvasId.get(edge.to.nodeId);
    if (!fromNode || !toNode) continue;

    const fromComfy = canvasIdToComfyId.get(fromNode.id);
    const toComfy = canvasIdToComfyId.get(toNode.id);
    if (fromComfy == null || toComfy == null) continue;

    const fromDef = resolveDef(fromNode);
    const toDef = resolveDef(toNode);
    const fromSlot = fromDef.outputs.findIndex((o) => o.id === edge.from.portId);
    const toSlot = toDef.inputs.findIndex((i) => i.id === edge.to.portId);
    if (fromSlot < 0 || toSlot < 0) continue;

    addLink(fromComfy, fromSlot, toComfy, toSlot, toComfySlotType(edge.dataType));
  }

  const comfyNodes: ComfyWorkflowNode[] = [];

  for (let i = 0; i < imagePlans.length; i++) {
    const plan = imagePlans[i]!;
    const key = `${plan.element.id}:${plan.edge.from.portId}`;
    const sourceId = imageSourceComfyIds.get(key)!;
    const outLink = links.find(
      (l) => l[1] === sourceId && l[2] === 0,
    )?.[0];

    comfyNodes.push(
      buildImageSourceComfyNode(sourceId, plan, i, outLink ?? null),
    );
  }

  sortedAi.forEach((node, order) => {
    const comfyId = canvasIdToComfyId.get(node.id)!;
    const def = resolveDef(node);

    const comfyType =
      node.type === "comfy-bridge"
        ? String(node.params._comfyType ?? "AiCanvas.UnknownNode")
        : canvasTypeToComfyType(node.type);

    const inputLinks = new Map<number, number>();
    const outputLinkIds = new Map<number, number[]>();

    for (const link of links) {
      const [lid, fromNodeId, fromSlot, toNodeId, toSlot] = link;
      if (toNodeId === comfyId) inputLinks.set(toSlot, lid);
      if (fromNodeId === comfyId) {
        const arr = outputLinkIds.get(fromSlot) ?? [];
        arr.push(lid);
        outputLinkIds.set(fromSlot, arr);
      }
    }

    const inputs: ComfyWorkflowNodeInput[] = def.inputs.map((inp, idx) => ({
      name: inp.name,
      type: toComfySlotType(inp.dataType),
      link: inputLinks.get(idx) ?? null,
    }));

    const outputs: ComfyWorkflowNodeOutput[] = def.outputs.map((out, idx) => ({
      name: out.name,
      type: toComfySlotType(out.dataType),
      links: outputLinkIds.get(idx) ?? null,
    }));

    comfyNodes.push({
      id: comfyId,
      type: comfyType,
      pos: [node.x, node.y],
      size: [
        Math.max(AI_NODE_MIN_WIDTH, node.width),
        Math.max(AI_NODE_MIN_HEIGHT, node.height),
      ],
      flags: {},
      order: imagePlans.length + order,
      mode: 0,
      inputs,
      outputs,
      properties: {
        widget_ue_connectable: {},
        "Node name for S&R": comfyType,
        "ai-canvas": {
          canvasNodeId: node.id,
          canvasType: node.type,
        },
      },
      widgets_values: paramsToWidgetsValues(node, def),
    });
  });

  const extra: Record<string, unknown> = {
    workflowRendererVersion: "LG",
    ue_links: [],
    ds: options?.viewport
      ? {
          scale: options.viewport.zoom,
          offset: [options.viewport.pan.x, options.viewport.pan.y],
        }
      : { scale: 1, offset: [0, 0] },
    frontendVersion: "1.39.19",
    "ai-canvas": {
      version: 2,
      nodeIdByCanvasId: Object.fromEntries(canvasIdToComfyId),
      imageSourcePlans: imagePlans.map((p) => ({
        elementId: p.element.id,
        portId:
          p.edge.from.kind === "image-element"
            ? p.edge.from.portId
            : "image",
        ossUrl: p.ossUrl,
        maskOssUrl: p.maskOssUrl,
        targetNodeId:
          p.edge.to.kind === "ai-node" ? p.edge.to.nodeId : undefined,
        targetPortId:
          p.edge.to.kind === "ai-node" ? p.edge.to.portId : undefined,
      })),
    } satisfies AiCanvasComfyExtra,
  };

  const lastNodeId = comfyNodes.length
    ? Math.max(...comfyNodes.map((n) => n.id))
    : 0;
  const lastLinkId = links.length ? Math.max(...links.map((l) => l[0])) : 0;

  return {
    id: nanoid(),
    revision: 0,
    last_node_id: lastNodeId,
    last_link_id: lastLinkId,
    nodes: comfyNodes.sort((a, b) => a.order - b.order),
    links,
    groups: [],
    config: {},
    extra,
    version: 0.4,
  };
}
