import { apiPostJson } from "../../api/aiClient";

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
      return { ok: false, message: `非 JSON 响应: ${text.slice(0, 200)}` };
    }
    if (!res.ok) {
      return {
        ok: false,
        message:
          typeof data.detail === "string"
            ? data.detail
            : `HTTP ${res.status}`,
      };
    }
    return { ok: true, outputs: (data.outputs ?? {}) as Record<string, unknown> };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
