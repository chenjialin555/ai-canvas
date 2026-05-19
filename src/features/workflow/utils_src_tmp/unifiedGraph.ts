import type { CanvasElement, ImageElement, Page } from "../../editor/types";
import { exportImageMaskToDataURL } from "../../image-tools/mask/maskRasterize";
import { getWorkflowNodeDefinition } from "../nodeRegistry";
import {
  AI_NODE_MAX_HEIGHT,
  AI_NODE_MIN_HEIGHT,
  AI_NODE_MIN_WIDTH,
  aiInputPortCenterLocal,
  aiOutputPortCenterLocal,
  bezierHorizontalOffset,
  imageOutputPortOffset,
} from "../nodeLayout";
import type {
  NodeEdge,
  NodeEndpoint,
  WorkflowDataType,
  WorkflowGraph,
  WorkflowNode,
  WorkflowOutputValue,
} from "../types";

/** 将 AI 节点宽高钳到最小布局尺寸（就地或新对象） */
export function clampAiNodeDimensions<T extends { width: number; height: number }>(
  node: T,
): T {
  const w =
    typeof node.width === "number" && Number.isFinite(node.width) && node.width > 0
      ? node.width
      : AI_NODE_MIN_WIDTH;
  const h =
    typeof node.height === "number" &&
    Number.isFinite(node.height) &&
    node.height > 0
      ? node.height
      : AI_NODE_MIN_HEIGHT;
  return {
    ...node,
    width: Math.max(AI_NODE_MIN_WIDTH, w),
    height: Math.min(AI_NODE_MAX_HEIGHT, Math.max(AI_NODE_MIN_HEIGHT, h)),
  };
}

export function getOutgoingDataType(
  from: NodeEndpoint,
  page: Page,
): WorkflowDataType | null {
  if (from.kind === "image-element") {
    return from.portId === "mask" ? "mask" : "image";
  }
  const node = page.aiNodes.find((n) => n.id === from.nodeId);
  if (!node) return null;
  const def = getWorkflowNodeDefinition(node.type);
  const port = def.outputs.find((o) => o.id === from.portId);
  return port?.dataType ?? null;
}

export function resolveEndpointValue(
  endpoint: NodeEndpoint,
  page: Page,
): unknown {
  if (endpoint.kind === "image-element") {
    const el = page.elements.find((e) => e.id === endpoint.elementId) as
      | ImageElement
      | undefined;
    if (!el || el.type !== "image") return undefined;
    if (endpoint.portId === "image") {
      return {
        type: "image" as const,
        url: el.src,
        width: el.width,
        height: el.height,
      };
    }
    if (!el.aiMask) {
      return undefined;
    }
    return {
      type: "mask" as const,
      elementId: el.id,
      width: el.aiMask.width,
      height: el.aiMask.height,
    };
  }

  const node = page.aiNodes.find((n) => n.id === endpoint.nodeId);
  if (!node) return undefined;
  return node.outputs[endpoint.portId];
}

export function resolveAiNodeInputs(
  nodeId: string,
  page: Page,
): Record<string, unknown> {
  const node = page.aiNodes.find((n) => n.id === nodeId);
  if (!node) return {};
  const def = getWorkflowNodeDefinition(node.type);
  const inputs: Record<string, unknown> = {};

  for (const input of def.inputs) {
    const edge = page.edges.find(
      (e) =>
        e.to.kind === "ai-node" &&
        e.to.nodeId === nodeId &&
        e.to.portId === input.id,
    );
    if (!edge) {
      if (input.required) {
        throw new Error(`缺少输入：${input.label}`);
      }
      continue;
    }
    inputs[input.name] = resolveEndpointValue(edge.from, page);
  }
  return inputs;
}

export function findFirstCompatibleInputPort(
  def: ReturnType<typeof getWorkflowNodeDefinition>,
  dataType: string,
  edges: NodeEdge[],
  targetNodeId: string,
): { portId: string; name: string } | null {
  const candidates = def.inputs
    .filter((inp) => inp.dataType === dataType)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const inp of candidates) {
    if (inp.multiple) {
      return { portId: inp.id, name: inp.name };
    }
    const taken = edges.some(
      (e) =>
        e.to.kind === "ai-node" &&
        e.to.nodeId === targetNodeId &&
        e.to.portId === inp.id,
    );
    if (!taken) {
      return { portId: inp.id, name: inp.name };
    }
  }
  return null;
}

function aiNodePortWorld(
  node: WorkflowNode,
  portId: string,
  direction: "input" | "output",
): { x: number; y: number } {
  const def = getWorkflowNodeDefinition(node.type);
  const list = direction === "input" ? def.inputs : def.outputs;
  const idx = Math.max(
    0,
    list.findIndex((p) => p.id === portId),
  );
  const local =
    direction === "input"
      ? aiInputPortCenterLocal(idx)
      : aiOutputPortCenterLocal(idx, node.width);
  return { x: node.x + local.x, y: node.y + local.y };
}

export function edgeBezierPointsUnified(
  page: Page,
  edge: NodeEdge,
): number[] {
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;

  const fromEp = edge.from;
  if (fromEp.kind === "image-element") {
    const el = page.elements.find((e) => e.id === fromEp.elementId) as
      | ImageElement
      | undefined;
    if (!el || el.type !== "image") {
      return [0, 0, 0, 0, 0, 0, 0, 0];
    }
    const o = imageOutputPortOffset(fromEp.portId, el.width, el.height);
    x1 = el.x + o.x;
    y1 = el.y + o.y;
  } else {
    const n = page.aiNodes.find((a) => a.id === fromEp.nodeId);
    if (!n) return [0, 0, 0, 0, 0, 0, 0, 0];
    const p = aiNodePortWorld(n, fromEp.portId, "output");
    x1 = p.x;
    y1 = p.y;
  }

  const toEp = edge.to;
  if (toEp.kind !== "ai-node") {
    const x2 = x1 + 1;
    const y2 = y1;
    const off = bezierHorizontalOffset(x1, x2);
    return [x1, y1, x1 + off, y1, x2 - off, y2, x2, y2];
  }
  const n2 = page.aiNodes.find((a) => a.id === toEp.nodeId);
  if (!n2) return [x1, y1, x1 + 120, y1, x1 + 120, y1, x1, y1];
  const p2 = aiNodePortWorld(n2, toEp.portId, "input");
  x2 = p2.x;
  y2 = p2.y;

  const off = bezierHorizontalOffset(x1, x2);
  const cx1 = x1 + off;
  const cx2 = x2 - off;
  return [x1, y1, cx1, y1, cx2, y2, x2, y2];
}

export function tempWireFromEndpoint(
  page: Page,
  from: NodeEndpoint,
  pointerX: number,
  pointerY: number,
): number[] {
  let x1: number;
  let y1: number;
  if (from.kind === "image-element") {
    const el = page.elements.find((e) => e.id === from.elementId) as
      | ImageElement
      | undefined;
    if (!el || el.type !== "image") return [pointerX, pointerY, pointerX, pointerY];
    const o = imageOutputPortOffset(from.portId, el.width, el.height);
    x1 = el.x + o.x;
    y1 = el.y + o.y;
  } else {
    const n = page.aiNodes.find((a) => a.id === from.nodeId);
    if (!n) return [pointerX, pointerY, pointerX, pointerY];
    const p = aiNodePortWorld(n, from.portId, "output");
    x1 = p.x;
    y1 = p.y;
  }
  const x2 = pointerX;
  const y2 = pointerY;
  const off = bezierHorizontalOffset(x1, x2);
  return [x1, y1, x1 + off, y1, x2 - off, y2, x2, y2];
}

/** 旧 workflow 图迁移为 aiNodes + NodeEdge */
export function migrateLegacyWorkflowGraph(
  graph: WorkflowGraph,
  elements: CanvasElement[],
): { aiNodes: WorkflowNode[]; edges: NodeEdge[] } {
  const aiNodes: WorkflowNode[] = [];
  const wfNodeIdToImageSource = new Map<
    string,
    { elementId: string; portId: "image" | "mask" }
  >();

  for (const n of graph.nodes) {
    if (n.type === "image-input" && n.elementId) {
      wfNodeIdToImageSource.set(n.id, {
        elementId: n.elementId,
        portId: "image",
      });
      continue;
    }
    if (n.type === "mask-input" && n.elementId) {
      wfNodeIdToImageSource.set(n.id, {
        elementId: n.elementId,
        portId: "mask",
      });
      continue;
    }
    aiNodes.push(clampAiNodeDimensions({ ...n }));
  }

  const edges: NodeEdge[] = [];

  function endpointFor(
    wfNodeId: string,
    portId: string,
    role: "from" | "to",
  ): NodeEndpoint | null {
    if (role === "to") {
      if (wfNodeIdToImageSource.has(wfNodeId)) return null;
      return { kind: "ai-node", nodeId: wfNodeId, portId };
    }

    const src = wfNodeIdToImageSource.get(wfNodeId);
    if (src) {
      const el = elements.find((e) => e.id === src.elementId);
      if (!el || el.type !== "image") return null;
      const outPort: "image" | "mask" =
        portId === "mask" || src.portId === "mask" ? "mask" : "image";
      if (outPort === "mask" && !el.aiMask) return null;
      return {
        kind: "image-element",
        elementId: src.elementId,
        portId: outPort,
      };
    }

    return { kind: "ai-node", nodeId: wfNodeId, portId };
  }

  for (const e of graph.edges) {
    const from = endpointFor(e.fromNodeId, e.fromPortId, "from");
    const to = endpointFor(e.toNodeId, e.toPortId, "to");
    if (!from || !to) continue;
    if (to.kind !== "ai-node") continue;
    edges.push({
      id: e.id,
      from,
      to,
      dataType: e.dataType,
      createdAt: e.createdAt,
    });
  }

  return { aiNodes, edges };
}

export function maskPlaceholderForApi(
  el: ImageElement,
): WorkflowOutputValue | null {
  if (!el.aiMask) return null;
  const url = exportImageMaskToDataURL(el);
  if (!url) return null;
  return {
    type: "mask",
    url,
    width: el.aiMask.width,
    height: el.aiMask.height,
  };
}
