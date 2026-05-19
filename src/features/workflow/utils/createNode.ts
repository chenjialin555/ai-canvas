import { nanoid } from "nanoid";
import { getWorkflowNodeDefinition } from "../nodeRegistry";
import {
  AI_NODE_MAX_HEIGHT,
  AI_NODE_MIN_HEIGHT,
  AI_NODE_MIN_WIDTH,
  AI_NODE_PORT_GAP,
  AI_NODE_PORT_ROW_START,
  AI_NODE_PREVIEW_MAX_H,
} from "../nodeLayout";
import type { WorkflowNode } from "../types";

const NODE_W = 280;

export function defaultWorkflowNodeSize(type: string): { width: number; height: number } {
  const def = getWorkflowNodeDefinition(type);
  const inputRows = def.inputs.length;
  const outputRows = def.outputs.length;
  const portRows = Math.max(inputRows, outputRows, 1);
  const portBottom = AI_NODE_PORT_ROW_START + portRows * AI_NODE_PORT_GAP;
  const summaryH = def.params.length > 0 ? 40 : 10;
  const previewBlock = def.preview?.enabled ? AI_NODE_PREVIEW_MAX_H + 28 : 0;
  const footer = 56;
  let h = portBottom + summaryH + previewBlock + footer;
  h = Math.max(AI_NODE_MIN_HEIGHT, Math.min(AI_NODE_MAX_HEIGHT, h));
  const w = Math.max(AI_NODE_MIN_WIDTH, NODE_W);
  return { width: w, height: h };
}

export function createWorkflowNode(
  type: string,
  x: number,
  y: number,
  partial?: Partial<Pick<WorkflowNode, "elementId" | "title">>,
): WorkflowNode {
  const def = getWorkflowNodeDefinition(type);
  const { width, height } = defaultWorkflowNodeSize(type);
  const now = Date.now();
  return {
    id: nanoid(),
    type,
    title: partial?.title ?? def.title,
    x,
    y,
    width,
    height,
    status: "idle",
    params: { ...def.defaultParams },
    outputs: {},
    elementId: partial?.elementId,
    createdAt: now,
    updatedAt: now,
  };
}
