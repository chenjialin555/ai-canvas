/**
 * AI 节点布局规范（世界坐标，与 WorkflowNodeView、unifiedGraph 必须一致）
 */
import type { WorkflowNodeDefinition } from "./types";

export const AI_NODE_MIN_WIDTH = 340;
export const AI_NODE_MIN_HEIGHT = 280;
export const AI_NODE_MAX_HEIGHT = 420;

/** 顶栏彩色条高度（现代卡片模板） */
export const AI_NODE_TOP_BAR_H = 5;

/** 标题区高度（含顶栏下内边距） */
export const AI_NODE_HEADER_H = 48;

export const AI_NODE_BODY_PAD_X = 18;
export const AI_NODE_BODY_PAD_BOTTOM = 18;

/** 第一行端口圆心的 Y（相对节点顶部） */
export const AI_NODE_PORT_ROW_START = 64;
/** 端口行距（圆心到圆心） */
export const AI_NODE_PORT_GAP = 30;

/** @deprecated 与 AI_NODE_PORT_ROW_START 同义 */
export const AI_NODE_PORT_TOP = AI_NODE_PORT_ROW_START;
/** @deprecated 与 AI_NODE_PORT_GAP 同义 */
export const AI_NODE_PORT_STEP = AI_NODE_PORT_GAP;

/** 输入端口圆心距左边缘 */
export const AI_NODE_INPUT_PORT_CX = 12;
/** 输出端口圆心距右边缘 */
export const AI_NODE_OUTPUT_PORT_CX = 12;

/** 预览区最大高度 */
export const AI_NODE_PREVIEW_MAX_H = 112;
export const AI_NODE_PREVIEW_X = 18;

/** 节点说明区块（section 标题 + 描述框） */
export const AI_NODE_DESC_SECTION_H = 78;
/** 输出预览区块（section 标题 + 预览框） */
export const AI_NODE_PREVIEW_SECTION_H = AI_NODE_PREVIEW_MAX_H + 26;
/** 底栏双按钮区 */
export const AI_NODE_ACTIONS_H = 44;
export const AI_NODE_ACTIONS_GAP = 10;

/** 根据节点定义计算推荐高度（非紧凑模式） */
export function computeWorkflowNodeHeight(
  def: WorkflowNodeDefinition,
  compact = false,
): number {
  if (compact) {
    return Math.max(AI_NODE_MIN_HEIGHT, AI_NODE_HEADER_H + 56);
  }

  const portRows = Math.max(def.inputs.length, def.outputs.length, 1);
  const portBottom = AI_NODE_PORT_ROW_START + portRows * AI_NODE_PORT_GAP;
  const descBlock = def.description?.trim() ? AI_NODE_DESC_SECTION_H : 0;
  const previewBlock = def.preview?.enabled ? AI_NODE_PREVIEW_SECTION_H : 0;
  const footer = AI_NODE_ACTIONS_H + AI_NODE_BODY_PAD_BOTTOM + 8;

  let h = portBottom + descBlock + previewBlock + footer;
  h = Math.max(AI_NODE_MIN_HEIGHT, Math.min(AI_NODE_MAX_HEIGHT, h));
  return h;
}

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
