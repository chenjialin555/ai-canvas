import { nanoid } from "nanoid";
import { getWorkflowNodeDefinition } from "../model/nodeRegistry";
import {
  AI_NODE_MIN_WIDTH,
  computeWorkflowNodeHeight,
} from "../model/nodeLayout";
import type { WorkflowNode } from "../model/types";

export function defaultWorkflowNodeSize(type: string): {
  width: number;
  height: number;
} {
  const def = getWorkflowNodeDefinition(type);
  return {
    width: AI_NODE_MIN_WIDTH,
    height: computeWorkflowNodeHeight(def),
  };
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
