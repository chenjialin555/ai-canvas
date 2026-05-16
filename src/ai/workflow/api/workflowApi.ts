import { apiPostJson } from "../../api/aiClient";
import { normalizeAiError } from "../../errors/normalizeAiError";

export type WorkflowRunNodePayload = {
  nodeType: string;
  inputs: Record<string, unknown>;
  params: unknown;
  traceId: string;
};

/**
 * `POST /api/workflow/run-node`：与原先 `workflowSlice` 内联请求/解析一致（仅 `Content-Type`，无 `X-Request-ID` 头）。
 */
export async function postWorkflowRunNode(
  payload: WorkflowRunNodePayload,
): Promise<
  | { ok: true; outputs: Record<string, unknown> }
  | { ok: false; message: string }
> {
  try {
    const res = await apiPostJson(
      "/api/workflow/run-node",
      {
        nodeType: payload.nodeType,
        inputs: payload.inputs,
        params: payload.params,
        traceId: payload.traceId,
      },
      undefined,
    );
    const text = await res.text();
    let data: { outputs?: Record<string, unknown>; detail?: unknown };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return {
        ok: false,
        message: normalizeAiError(
          { reason: "not_json", message: text },
          "工作流接口返回格式异常",
        ),
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: normalizeAiError(
          { status: res.status, detail: data.detail },
          `工作流节点运行失败（HTTP ${res.status}）`,
        ),
      };
    }
    return { ok: true, outputs: (data.outputs ?? {}) as Record<string, unknown> };
  } catch (e) {
    return {
      ok: false,
      message: normalizeAiError(
        e instanceof Error ? e : String(e),
        "工作流节点运行失败",
      ),
    };
  }
}
