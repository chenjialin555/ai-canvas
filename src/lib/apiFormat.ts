/** FastAPI / gateway `detail` → 单行可读文案 */
export function formatApiDetail(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg?: string }).msg)
          : JSON.stringify(item),
      )
      .filter(Boolean)
      .join("；");
  }
  if (typeof detail === "object") return JSON.stringify(detail);
  return String(detail);
}
