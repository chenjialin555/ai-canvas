/** 单步 AI 等 JSON API 的 POST 封装（不含业务解析） */
export async function apiPostJson(
  path: string,
  body: unknown,
  traceId?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (traceId) {
    headers["X-Request-ID"] = traceId;
  }
  return fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
