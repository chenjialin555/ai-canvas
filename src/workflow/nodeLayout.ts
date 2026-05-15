/**
 * AI 节点布局规范（世界坐标，与 WorkflowNodeView、unifiedGraph 必须一致）
 */
export const AI_NODE_MIN_WIDTH = 280;
export const AI_NODE_MIN_HEIGHT = 220;
export const AI_NODE_MAX_HEIGHT = 360;

/** 标题栏高度（含与端口区的分隔） */
export const AI_NODE_HEADER_H = 40;
/** 第一行端口圆心的 Y（相对节点顶部；与标题栏留出空隙） */
export const AI_NODE_PORT_ROW_START = 58;
/** 端口行距（圆心到圆心） */
export const AI_NODE_PORT_GAP = 28;

/** @deprecated 与 AI_NODE_PORT_ROW_START 同义 */
export const AI_NODE_PORT_TOP = AI_NODE_PORT_ROW_START;
/** @deprecated 与 AI_NODE_PORT_GAP 同义 */
export const AI_NODE_PORT_STEP = AI_NODE_PORT_GAP;

/** 输入端口圆心距左边缘 */
export const AI_NODE_INPUT_PORT_CX = 10;
/** 输出端口圆心距右边缘 */
export const AI_NODE_OUTPUT_PORT_CX = 10;

/** 预览区最大高度（节点内缩略图区域） */
export const AI_NODE_PREVIEW_MAX_H = 120;
/** 预览区左边距（与 WorkflowNodeView 内边距一致） */
export const AI_NODE_PREVIEW_X = 12;

/** 图片节点右侧端口：image 约 42% 高，mask 约 58% 高 */
export function imageOutputPortOffset(
  portId: "image" | "mask",
  width: number,
  height: number,
): { x: number; y: number } {
  const x = width + 6;
  const y = portId === "image" ? height * 0.42 : height * 0.58;
  return { x, y };
}

export function aiInputPortCenterLocal(index: number): { x: number; y: number } {
  return {
    x: AI_NODE_INPUT_PORT_CX,
    y: AI_NODE_PORT_ROW_START + index * AI_NODE_PORT_GAP,
  };
}

export function aiOutputPortCenterLocal(
  index: number,
  nodeWidth: number,
): { x: number; y: number } {
  return {
    x: nodeWidth - AI_NODE_OUTPUT_PORT_CX,
    y: AI_NODE_PORT_ROW_START + index * AI_NODE_PORT_GAP,
  };
}

/** 贝塞尔控制点水平偏移（世界坐标） */
export function bezierHorizontalOffset(x1: number, x2: number): number {
  const dx = Math.abs(x2 - x1);
  return Math.max(80, Math.min(180, dx * 0.5));
}
