import { nanoid } from "nanoid";
import type { WorkflowNode } from "../../../workflow/types";
import { postWorkflowRunNode } from "../api/workflowApi";

/**
 * 在 store 已完成 `serializeWorkflowInputsForApi` 且已置 `running` 后，调用远端执行。
 */
export async function executeWorkflowNodeRemoteRun(
  node: WorkflowNode,
  inputsSerialized: Record<string, unknown>,
): Promise<Awaited<ReturnType<typeof postWorkflowRunNode>>> {
  const traceId = nanoid();
  return postWorkflowRunNode({
    nodeType: node.type,
    inputs: inputsSerialized,
    params: node.params,
    traceId,
  });
}
