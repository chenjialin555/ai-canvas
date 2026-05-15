import type {
  CanvasElement,
  EditorState,
  ImageMaskData,
  Page,
  ProjectJSON,
  ToolType,
} from "../types";
import type { QuickToolId, QuickToolbarScopeKey } from "../quickTools";
import type { NodeEdge, NodeEndpoint, WorkflowNode } from "../../workflow/types";

export type Snapshot = Pick<
  EditorState,
  | "pages"
  | "activePageId"
  | "selectedIds"
  | "selectedWorkflowNodeIds"
  | "zoom"
  | "pan"
>;

/** 剪贴板：画布元素，或 AI 节点 + 节点之间的连线（不含指向画布图片的边） */
export type EditorClipboard =
  | { kind: "elements"; items: CanvasElement[] }
  | {
      kind: "workflow";
      nodes: WorkflowNode[];
      internalEdges: NodeEdge[];
    };

export type Store = EditorState & {
  /** 框选进行中：隐藏浮动快捷条 */
  marqueeSelecting: boolean;
  /** 拖动画布 / 元素 / 变换时隐藏浮动条 */
  floatingToolbarSuppressed: boolean;

  historyPast: Snapshot[];
  historyFuture: Snapshot[];

  clipboard: EditorClipboard;

  getActivePage: () => Page;
  getSelectedElements: () => CanvasElement[];

  commitHistory: () => void;
  undo: () => void;
  redo: () => void;

  /** 清空画布元素与 AI 节点选区（空白点击、Esc 等） */
  clearCanvasSelection: () => void;
  setSelectedIds: (ids: string[]) => void;
  updateElement: (
    id: string,
    patch: Partial<CanvasElement>,
    options?: { history?: boolean },
  ) => void;
  addElement: (element: CanvasElement) => void;
  removeSelected: () => void;

  copy: () => void;
  paste: () => void;
  selectAll: () => void;

  alignSelected: (
    type:
      | "left"
      | "center"
      | "right"
      | "top"
      | "middle"
      | "bottom",
  ) => void;
  distributeSelected: (type: "horizontal" | "vertical") => void;

  groupSelected: () => void;
  ungroupSelected: () => void;

  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTool: (tool: ToolType) => void;

  setEditingTextId: (id: string | null) => void;

  setQuickToolbarConfig: (
    scope: QuickToolbarScopeKey,
    ids: QuickToolId[],
  ) => void;
  setMarqueeSelecting: (v: boolean) => void;
  setFloatingToolbarSuppressed: (v: boolean) => void;

  replaceImageKeepFrame: (id: string, src: string) => void;

  setImageAIMask: (id: string, mask: ImageMaskData | null) => void;
  clearImageAIMask: (id: string) => void;

  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  addPage: () => void;
  duplicatePage: (id: string) => void;
  removePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  setActivePageId: (id: string) => void;

  exportProjectJSON: () => ProjectJSON;
  loadProjectJSON: (json: ProjectJSON) => void;
  saveLocal: () => void;
  saveRemote: (url: string) => Promise<void>;
  loadRemote: (url: string) => Promise<void>;

  setEditorMode: () => void;
  setSelectedWorkflowNodeIds: (ids: string[]) => void;

  addWorkflowNode: (node: WorkflowNode) => void;
  updateWorkflowNode: (
    nodeId: string,
    patch: Partial<WorkflowNode>,
    options?: { history?: boolean },
  ) => void;
  removeWorkflowNode: (nodeId: string) => void;

  addWorkflowEdge: (edge: NodeEdge) => void;
  removeWorkflowEdge: (edgeId: string) => void;

  startWorkflowConnecting: (
    from: NodeEndpoint,
    pointerX: number,
    pointerY: number,
  ) => void;
  updateWorkflowConnectingPointer: (pointerX: number, pointerY: number) => void;
  cancelWorkflowConnecting: () => void;

  completeWorkflowConnectingToInput: (to: NodeEndpoint) => void;

  openWorkflowNodePicker: (x: number, y: number) => void;
  openWorkflowNodePickerAtWorld: (x: number, y: number) => void;
  closeWorkflowNodePicker: () => void;
  createWorkflowNodeFromPicker: (type: string) => void;

  runWorkflowNode: (nodeId: string) => Promise<void>;
  sendWorkflowResultToCanvas: (nodeId: string, outputKey?: string) => void;
};
