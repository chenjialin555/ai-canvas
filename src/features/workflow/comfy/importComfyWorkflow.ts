import { nanoid } from "nanoid";
import { getImageDefaults } from "../../editor/store/helpers/imageDefaults";
import type { ImageElement } from "../../editor/types";
import { getWorkflowNodeDefinition } from "../model/nodeRegistry";
import { buildComfyBridgeDefinition } from "./buildComfyBridgeDefinition";
import { clampAiNodeDimensions } from "../utils/unifiedGraph";
import {
  comfyTypeToCanvasType,
  isImageSourceComfyType,
  isMaskSourceComfyType,
} from "./comfyTypeMap";
import type {
  AiCanvasComfyExtra,
  ComfyWorkflowJSON,
  ComfyWorkflowLink,
  ComfyWorkflowNode,
} from "./comfyWorkflowTypes";
import type { NodeEdge, WorkflowNode } from "../model/types";

export type ImportComfyResult = {
  aiNodes: WorkflowNode[];
  edges: NodeEdge[];
  /** 由 AiCanvas.ImageSource 恢复的画布图片 */
  elements: ImageElement[];
  viewport?: { zoom: number; pan: { x: number; y: number } };
  warnings: string[];
};

function comfySlotTypeToDataType(t: string): NodeEdge["dataType"] {
  const u = t.toUpperCase();
  if (u === "IMAGE") return "image";
  if (u === "MASK") return "mask";
  if (u === "STRING") return "text";
  return "json";
}

function widgetsToParams(
  canvasType: string,
  widgets: unknown[],
): Record<string, unknown> {
  if (canvasType === "comfy-bridge") {
    return { _comfyWidgets: widgets };
  }
  try {
    const def = getWorkflowNodeDefinition(canvasType);
    const params: Record<string, unknown> = {};
    def.params.forEach((p, i) => {
      if (widgets[i] !== undefined) params[p.id] = widgets[i];
    });
    return params;
  } catch {
    return { _comfyWidgets: widgets };
  }
}

function isCanvasImageSourceNode(cn: ComfyWorkflowNode): boolean {
  if (isImageSourceComfyType(cn.type) || isMaskSourceComfyType(cn.type)) {
    return true;
  }
  if (cn.type === "LoadImage") return true;
  return false;
}

function readImageUrlFromComfyNode(cn: ComfyWorkflowNode): string {
  const w = cn.widgets_values;
  if (!Array.isArray(w) || !w.length) return "";
  const first = w[0];
  if (typeof first === "string") return first;
  return "";
}

function importComfyAiNode(
  cn: ComfyWorkflowNode,
  warnings: string[],
): WorkflowNode | null {
  if (isCanvasImageSourceNode(cn)) return null;

  const meta = cn.properties?.["ai-canvas"] as
    | { canvasNodeId?: string; canvasType?: string }
    | undefined;

  let canvasType = meta?.canvasType ?? comfyTypeToCanvasType(cn.type);
  if (canvasType === "__image_source__" || canvasType === "__mask_source__") {
    return null;
  }
  if (canvasType !== "comfy-bridge") {
    try {
      getWorkflowNodeDefinition(canvasType);
    } catch {
      canvasType = "comfy-bridge";
      warnings.push(`未知节点类型 ${cn.type}，已作为占位节点导入`);
    }
  }

  const now = Date.now();
  const params: Record<string, unknown> = {
    ...widgetsToParams(canvasType, cn.widgets_values ?? []),
    _comfyType: cn.type,
    _comfyProperties: { ...cn.properties },
    _comfyInputs: cn.inputs,
    _comfyOutputs: cn.outputs,
  };

  if (canvasType !== "comfy-bridge") {
    const def = getWorkflowNodeDefinition(canvasType);
    def.params.forEach((p) => {
      if (params[p.id] === undefined && p.defaultValue !== undefined) {
        params[p.id] = p.defaultValue;
      }
    });
  }

  try {
    const def = getWorkflowNodeDefinition(canvasType);
    return clampAiNodeDimensions({
      id: meta?.canvasNodeId ?? nanoid(),
      type: canvasType,
      title: def.title,
      x: cn.pos[0] ?? 0,
      y: cn.pos[1] ?? 0,
      width: cn.size[0] ?? 280,
      height: cn.size[1] ?? 220,
      status: "idle" as const,
      params,
      outputs: {},
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return clampAiNodeDimensions({
      id: meta?.canvasNodeId ?? nanoid(),
      type: "comfy-bridge",
      title: cn.type,
      x: cn.pos[0] ?? 0,
      y: cn.pos[1] ?? 0,
      width: cn.size[0] ?? 280,
      height: cn.size[1] ?? 220,
      status: "idle" as const,
      params,
      outputs: {},
      createdAt: now,
      updatedAt: now,
    });
  }
}

function resolvePortIds(
  node: WorkflowNode,
  slot: number,
  direction: "input" | "output",
): string | null {
  if (node.type === "comfy-bridge") {
    const def = buildComfyBridgeDefinition(node);
    const list = direction === "input" ? def.inputs : def.outputs;
    return list[slot]?.id ?? null;
  }
  const def = getWorkflowNodeDefinition(node.type);
  const list = direction === "input" ? def.inputs : def.outputs;
  return list[slot]?.id ?? null;
}

function importAiLinks(
  links: ComfyWorkflowLink[],
  comfyIdToNode: Map<number, WorkflowNode>,
  warnings: string[],
): NodeEdge[] {
  const edges: NodeEdge[] = [];
  const now = Date.now();

  for (const link of links) {
    const [, fromComfyId, fromSlot, toComfyId, toSlot, typeStr] = link;
    const fromNode = comfyIdToNode.get(fromComfyId);
    const toNode = comfyIdToNode.get(toComfyId);
    if (!fromNode || !toNode) continue;

    const fromPortId = resolvePortIds(fromNode, fromSlot, "output");
    const toPortId = resolvePortIds(toNode, toSlot, "input");
    if (!fromPortId || !toPortId) {
      warnings.push(
        `连线 ${fromComfyId}[${fromSlot}] → ${toComfyId}[${toSlot}] 端口无法映射，已跳过`,
      );
      continue;
    }

    edges.push({
      id: nanoid(),
      from: { kind: "ai-node", nodeId: fromNode.id, portId: fromPortId },
      to: { kind: "ai-node", nodeId: toNode.id, portId: toPortId },
      dataType: comfySlotTypeToDataType(typeStr),
      createdAt: now,
    });
  }

  return edges;
}

function importImageSourcesFromComfy(
  json: ComfyWorkflowJSON,
  comfyIdToNode: Map<number, WorkflowNode>,
  warnings: string[],
): { elements: ImageElement[]; edges: NodeEdge[] } {
  const elements: ImageElement[] = [];
  const edges: NodeEdge[] = [];
  const now = Date.now();
  const elementByComfyId = new Map<number, ImageElement>();

  for (const cn of json.nodes ?? []) {
    if (typeof cn.id !== "number" || !isCanvasImageSourceNode(cn)) continue;

    const url = readImageUrlFromComfyNode(cn);
    if (!url) {
      warnings.push(`图片源节点 #${cn.id} 缺少 URL，已跳过`);
      continue;
    }

    const meta = cn.properties?.["ai-canvas"] as
      | { elementId?: string; portId?: "image" | "mask" }
      | undefined;

    const el: ImageElement = {
      id: meta?.elementId ?? nanoid(),
      type: "image",
      name:
        typeof meta === "object" && meta && "elementName" in meta
          ? String((meta as { elementName?: string }).elementName)
          : cn.type === "LoadImage"
            ? "导入图片"
            : "工作流图片",
      x: (cn.pos[0] ?? 0) + 280,
      y: cn.pos[1] ?? 0,
      width: 320,
      height: 240,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      src: url,
      ...getImageDefaults(),
    };
    elements.push(el);
    elementByComfyId.set(cn.id, el);
  }

  for (const link of json.links ?? []) {
    const [, fromComfyId, , toComfyId, toSlot, typeStr] = link;
    const el = elementByComfyId.get(fromComfyId);
    const toNode = comfyIdToNode.get(toComfyId);
    if (!el || !toNode) continue;

    const toDef =
      toNode.type === "comfy-bridge"
        ? buildComfyBridgeDefinition(toNode)
        : getWorkflowNodeDefinition(toNode.type);
    const toPort = toDef.inputs[toSlot];
    if (!toPort) continue;

    const portId =
      typeStr.toUpperCase() === "MASK"
        ? "mask"
        : ("image" as const);

    edges.push({
      id: nanoid(),
      from: { kind: "image-element", elementId: el.id, portId },
      to: { kind: "ai-node", nodeId: toNode.id, portId: toPort.id },
      dataType: comfySlotTypeToDataType(typeStr),
      createdAt: now,
    });
  }

  const extra = json.extra?.["ai-canvas"] as AiCanvasComfyExtra | undefined;
  if (extra?.imageSourcePlans?.length && elements.length === 0) {
    for (const plan of extra.imageSourcePlans) {
      const el: ImageElement = {
        id: plan.elementId,
        type: "image",
        name: "工作流图片",
        x: 0,
        y: 0,
        width: 320,
        height: 240,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        src: plan.ossUrl,
        ...getImageDefaults(),
      };
      elements.push(el);
      if (plan.targetNodeId && plan.targetPortId) {
        edges.push({
          id: nanoid(),
          from: {
            kind: "image-element",
            elementId: el.id,
            portId: plan.portId,
          },
          to: {
            kind: "ai-node",
            nodeId: plan.targetNodeId,
            portId: plan.targetPortId,
          },
          dataType: plan.portId === "mask" ? "mask" : "image",
          createdAt: now,
        });
      }
    }
  }

  return { elements, edges };
}

export function isComfyWorkflowJSON(data: unknown): data is ComfyWorkflowJSON {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.pages)) return false;
  return Array.isArray(o.nodes) && Array.isArray(o.links);
}

export function importComfyWorkflow(json: ComfyWorkflowJSON): ImportComfyResult {
  const warnings: string[] = [];
  const comfyIdToNode = new Map<number, WorkflowNode>();

  for (const cn of json.nodes ?? []) {
    if (typeof cn.id !== "number") continue;
    if (isCanvasImageSourceNode(cn)) continue;
    const node = importComfyAiNode(cn, warnings);
    if (node) comfyIdToNode.set(cn.id, node);
  }

  const aiEdges = importAiLinks(json.links ?? [], comfyIdToNode, warnings);
  const { elements, edges: imageEdges } = importImageSourcesFromComfy(
    json,
    comfyIdToNode,
    warnings,
  );

  const extra = json.extra?.["ai-canvas"] as AiCanvasComfyExtra | undefined;
  if (extra?.version === 1 && extra.canvasEdges?.length) {
    for (const e of extra.canvasEdges) {
      if (e && typeof e === "object" && "id" in e) {
        imageEdges.push(e as NodeEdge);
      }
    }
  }

  let viewport: ImportComfyResult["viewport"];
  const ds = json.extra?.ds as
    | { scale?: number; offset?: [number, number] }
    | undefined;
  if (ds && typeof ds.scale === "number" && Array.isArray(ds.offset)) {
    viewport = {
      zoom: ds.scale,
      pan: { x: ds.offset[0] ?? 0, y: ds.offset[1] ?? 0 },
    };
  }

  return {
    aiNodes: [...comfyIdToNode.values()],
    edges: [...aiEdges, ...imageEdges],
    elements,
    viewport,
    warnings,
  };
}
