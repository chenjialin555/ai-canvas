/**
 * 浏览器控制台排查用：打印 API 请求/响应；大字段（data URL 等）仅输出长度与摘要。
 */

const TAG = "[AI Canvas API]";

function isDataUrl(s: string): boolean {
  return s.startsWith("data:");
}

/** 将请求体中可能巨大的字段转为可读的摘要，便于 console 查看 */
export function summarizePayloadForLog(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string") {
      if (isDataUrl(v)) {
        out[k] = `<data URL ${v.length} chars>`;
      } else if (v.length > 180) {
        out[k] = `${v.slice(0, 180)}… (共 ${v.length} 字符)`;
      } else {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function summarizeResponseBodyForLog(
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...parsed };
  const u = out.url;
  if (typeof u === "string" && u.length > 200) {
    out.url = `${u.slice(0, 200)}… (共 ${u.length} 字符)`;
  }
  if ("raw" in out && out.raw !== undefined && out.raw !== null) {
    const rawStr = typeof out.raw === "string" ? out.raw : JSON.stringify(out.raw);
    out.raw = rawStr.length > 400 ? `${rawStr.slice(0, 400)}… (共 ${rawStr.length} 字符)` : out.raw;
  }
  return out;
}

export function logApiEvent(
  phase: "request" | "response" | "error",
  message: string,
  data?: unknown,
): void {
  const prefix = `${TAG} ${phase.toUpperCase()}`;
  if (data === undefined) {
    console.log(prefix, message);
    return;
  }
  console.log(prefix, message, data);
}
