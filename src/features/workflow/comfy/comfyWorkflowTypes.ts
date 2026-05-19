/** ComfyUI API 工作流 JSON（与 Comfy 前端导出格式对齐） */

export type ComfyWorkflowLink = [
  number,
  number,
  number,
  number,
  number,
  string,
];

export type ComfyWorkflowNodeInput = {
  name: string;
  type: string;
  link?: number | null;
  shape?: number;
  widget?: { name: string };
};

export type ComfyWorkflowNodeOutput = {
  name: string;
  type: string;
  links: number[] | null;
  slot_index?: number;
};

export type ComfyWorkflowNode = {
  id: number;
  type: string;
  pos: [number, number];
  size: [number, number];
  flags: Record<string, unknown>;
  order: number;
  mode: number;
  inputs: ComfyWorkflowNodeInput[];
  outputs: ComfyWorkflowNodeOutput[];
  properties: Record<string, unknown>;
  widgets_values: unknown[];
};

export type ComfyWorkflowJSON = {
  id?: string;
  revision?: number;
  last_node_id: number;
  last_link_id: number;
  nodes: ComfyWorkflowNode[];
  links: ComfyWorkflowLink[];
  groups: unknown[];
  config: Record<string, unknown>;
  extra: Record<string, unknown>;
  version: number;
};

export type AiCanvasComfyExtra = {
  version: 1 | 2;
  /** @deprecated v2 起图片连线已写入 nodes/links */
  canvasEdges?: unknown[];
  /** AI 节点 canvas id → comfy 数字 id */
  nodeIdByCanvasId?: Record<string, number>;
  /** v2：图片 OSS 导出记录 */
  imageSourcePlans?: Array<{
    elementId: string;
    portId: "image" | "mask";
    ossUrl: string;
    maskOssUrl?: string;
    targetNodeId?: string;
    targetPortId?: string;
  }>;
};
