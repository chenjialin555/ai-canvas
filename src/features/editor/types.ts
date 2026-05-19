import type { ImageFilter } from "./image-filter/imageFilter";

export type { ImageFilter } from "./image-filter/imageFilter";

export type ElementType = "image" | "rect" | "text" | "arrow" | "group";

export type ImageMaskShape = "rect" | "roundRect" | "circle";

export type MaskTool = "brush" | "eraser";

export type MaskStroke = {
  id: string;
  tool: MaskTool;
  points: number[];
  color: string;
  size: number;
  opacity: number;
  hardness: number;
};

export type ImageMaskData = {
  version: string;
  width: number;
  height: number;
  strokes: MaskStroke[];
};

export type BaseElement = {
  id: string;
  name: string;
  type: ElementType;

  x: number;
  y: number;
  width: number;
  height: number;

  rotation: number;
  opacity: number;

  visible: boolean;
  locked: boolean;

  parentId?: string | null;
};

export type ImageElement = BaseElement & {
  type: "image";
  src: string;

  cropOffsetX: number;
  cropOffsetY: number;
  cropScale: number;
  cropRotation: number;

  flipX?: boolean;
  flipY?: boolean;

  cornerRadius: number;
  maskShape: ImageMaskShape;

  filter: ImageFilter;

  /** AI 图像编辑蒙版 */
  aiMask?: ImageMaskData | null;

  /** 节点化元信息（图片即 ImageNode；默认可不填，由 UI 统一展示端口） */
  nodeMeta?: {
    enabled: true;
    nodeType: "image";
    outputs: Array<"image" | "mask">;
  };
};

export type RectElement = BaseElement & {
  type: "rect";
  fill: string;
  radius: number;
  stroke?: string;
  strokeWidth?: number;
};

export type TextElement = BaseElement & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  align: "left" | "center" | "right";
};

export type ArrowElement = BaseElement & {
  type: "arrow";
  stroke: string;
  strokeWidth: number;
};

export type GroupElement = BaseElement & {
  type: "group";
  children: string[];
};

export type CanvasElement =
  | ImageElement
  | RectElement
  | TextElement
  | ArrowElement
  | GroupElement;

import type {
  EditorMode,
  NodeEdge,
  WorkflowConnectingState,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodePickerState,
} from "../workflow/model/types";

export type Page = {
  id: string;
  name: string;
  elements: CanvasElement[];
  /** 画布上的 AI 功能节点 */
  aiNodes: WorkflowNode[];
  /** 图片元素端口 ↔ AI 节点端口 连线 */
  edges: NodeEdge[];
  /** @deprecated 由 migratePage 迁移到 aiNodes/edges */
  workflow?: WorkflowGraph;
};

export type ToolType = "select" | "rect" | "text" | "image" | "arrow" | "hand";

import type { QuickToolId, QuickToolbarScopeKey } from "./quick-tools/quickTools";

export type EditorState = {
  pages: Page[];
  activePageId: string;

  selectedIds: string[];

  zoom: number;
  pan: {
    x: number;
    y: number;
  };

  tool: ToolType;

  editingTextId: string | null;

  /** 各类型元素浮动快捷条按钮（持久化到 localStorage） */
  quickToolbarConfig: Record<QuickToolbarScopeKey, QuickToolId[]>;

  /** 保留字段；统一画布后恒为 canvas */
  editorMode: EditorMode;

  /** AI 功能节点多选 id */
  selectedWorkflowNodeIds: string[];

  /** 从端口拖线中的临时状态 */
  workflowConnecting: WorkflowConnectingState;

  /** 创建节点选择器 */
  workflowNodePicker: WorkflowNodePickerState;
};

export type ProjectJSON = {
  version: string;
  savedAt: string;
  pages: Page[];
  activePageId: string;
};
