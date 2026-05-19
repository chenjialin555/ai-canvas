import { apiPostJson } from "../../../shared/api/aiClient";

export type PostGenerateImageResult =
  | {
      ok: true;
      status: number;
      data: { url?: string; detail?: unknown };
      rawText: string;
      requestIdHeader: string | null;
    }
  | {
      ok: false;
      reason: "not_json";
      status: number;
      rawText: string;
      requestIdHeader: string | null;
    }
  | {
      ok: false;
      reason: "http_error";
      status: number;
      data: { url?: string; detail?: unknown };
      rawText: string;
      requestIdHeader: string | null;
    }
  | { ok: false; reason: "network"; message: string };

/** `POST /api/generate-image`：仅负责请求与 JSON 解析，不做业务日志与落画布 */
export async function postGenerateImage(
  payload: Record<string, unknown>,
  traceId: string,
): Promise<PostGenerateImageResult> {
  try {
    const res = await apiPostJson("/api/generate-image", payload, traceId);
    const requestIdHeader = res.headers.get("X-Request-ID");
    const rawText = await res.text();
    let data: { url?: string; detail?: unknown };
    try {
      data = JSON.parse(rawText) as { url?: string; detail?: unknown };
    } catch {
      return {
        ok: false,
        reason: "not_json",
        status: res.status,
        rawText,
        requestIdHeader,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: "http_error",
        status: res.status,
        data,
        rawText,
        requestIdHeader,
      };
    }
    return { ok: true, status: res.status, data, rawText, requestIdHeader };
  } catch (e) {
    return {
      ok: false,
      reason: "network",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
