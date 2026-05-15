import type { WorkflowNodeDefinition } from "./types";
import { INPAINT_NODE } from "./nodes/inpaint";
import { OUTPUT_VIEW_NODE } from "./nodes/outputView";
import { OUTPAINT_NODE } from "./nodes/outpaint";
import { STYLE_TRANSFER_NODE } from "./nodes/styleTransfer";
import { UPSCALE_NODE } from "./nodes/upscale";

export const WORKFLOW_NODE_REGISTRY: Record<string, WorkflowNodeDefinition> = {
  [INPAINT_NODE.type]: INPAINT_NODE,
  [OUTPUT_VIEW_NODE.type]: OUTPUT_VIEW_NODE,
  [STYLE_TRANSFER_NODE.type]: STYLE_TRANSFER_NODE,
  [UPSCALE_NODE.type]: UPSCALE_NODE,
  [OUTPAINT_NODE.type]: OUTPAINT_NODE,
};

export function getWorkflowNodeDefinition(type: string): WorkflowNodeDefinition {
  const def = WORKFLOW_NODE_REGISTRY[type];
  if (!def) {
    throw new Error(`Unknown workflow node type: ${type}`);
  }
  return def;
}

export function getWorkflowNodeList(): WorkflowNodeDefinition[] {
  return Object.values(WORKFLOW_NODE_REGISTRY);
}

/** 从某数据类型拖线创建节点时，可列出的目标（排除纯输入源中不需要的类型） */
export function listCreatableWorkflowNodes(
  fromDataType: string | null | undefined,
): WorkflowNodeDefinition[] {
  const all = getWorkflowNodeList();
  if (!fromDataType) return all;
  return all.filter((def) => {
    if (def.executor === "none" && !def.showRunBar) return false;
    return def.inputs.some((p) => p.dataType === fromDataType);
  });
}
