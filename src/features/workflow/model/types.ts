/**
 * AI 节点与端口类型（统一画布：Page.aiNodes + Page.edges；旧 Page.workflow 仅用于迁移）
 */

export type WorkflowDataType =
  | "image"
  | "mask"
  | "text"
  | "number"
  | "boolean"
  | "json"
  | "model"
  | "latent"
  | "conditioning";

export type WorkflowPortDirection = "input" | "output";

export type WorkflowNodeStatus =
  | "idle"
  | "ready"
  | "running"
  | "success"
  | "error";

export type WorkflowOutputValue =
  | {
      type: "image";
      url: string;
      width?: number;
      height?: number;
    }
  | {
      type: "mask";
      url: string;
      width?: number;
      height?: number;
    }
  | {
      type: "text";
      text: string;
    }
  | {
      type: "json";
      value: unknown;
    };

export type WorkflowPortDefinition = {
  id: string;
  name: string;
  label: string;
  dataType: WorkflowDataType;
  direction: WorkflowPortDirection;
  required?: boolean;
  multiple?: boolean;
  order?: number;
};

export type WorkflowParamDefinition = {
  id: string;
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "slider"
    | "boolean";
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
};

export type WorkflowNodeDefinition = {
  type: string;
  title: string;
  description: string;
  category: string;
  inputs: WorkflowPortDefinition[];
  outputs: WorkflowPortDefinition[];
  params: WorkflowParamDefinition[];
  defaultParams: Record<string, unknown>;
  preview?: {
    enabled: boolean;
    outputKey: string;
    type: "image" | "mask" | "text" | "json";
  };
  /** 后端执行器 id；无远端调用时为 none */
  executor: string;
  /** 为 true 时仍显示运行条（如客户端同步类节点，executor 可为 none） */
  showRunBar?: boolean;
};

export type WorkflowNode = {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: WorkflowNodeStatus;
  params: Record<string, unknown>;
  outputs: Record<string, WorkflowOutputValue>;
  /** 引用画布上的图片元素（image-input / mask-input） */
  elementId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

export type WorkflowEdge = {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  dataType: WorkflowDataType;
  createdAt: number;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

/** 连线端点：画布图片元素端口 或 AI 功能节点端口 */
export type NodeEndpoint =
  | {
      kind: "image-element";
      elementId: string;
      portId: "image" | "mask";
    }
  | { kind: "ai-node"; nodeId: string; portId: string };

export type NodeEdge = {
  id: string;
  from: NodeEndpoint;
  to: NodeEndpoint;
  dataType: WorkflowDataType;
  createdAt: number;
};

export type WorkflowConnectingState = {
  active: boolean;
  from: NodeEndpoint | null;
  dataType: WorkflowDataType | null;
  pointerX: number;
  pointerY: number;
};

export type WorkflowNodePickerState = {
  open: boolean;
  x: number;
  y: number;
  from?: NodeEndpoint;
  dataType?: WorkflowDataType;
};

export type EditorMode = "canvas";
