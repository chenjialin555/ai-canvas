/** V3：默认空白画布（无示例图/工作流节点）；与 V2 不兼容，首次升级会重新初始化 */
export const STORAGE_KEY = "AI_CANVAS_PRO_PROJECT_V3";

export const LOCAL_STORAGE_PERSIST_DEBOUNCE_MS = 600;

/** 超过此长度的 data: 图不写入 localStorage，避免 QuotaExceeded；刷新后大图需重新导入或重跑 */
export const TINY_PERSIST_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
