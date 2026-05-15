import { create } from "zustand";
import { produce } from "immer";
import { nanoid } from "nanoid";
import { logApiEvent } from "../lib/apiDebug";
import {
  DEFAULT_QUICK_TOOLBAR_CONFIG,
  mergeQuickToolbarConfig,
  normalizeQuickToolbarIds,
  type QuickToolId,
  type QuickToolbarScopeKey,
} from "./quickTools";
import type {
  CanvasElement,
  EditorState,
  ImageElement,
  ImageMaskData,
  Page,
  ProjectJSON,
  ToolType,
} from "./types";
import { getWorkflowNodeDefinition } from "../workflow/nodeRegistry";
import {
  createWorkflowNode,
} from "../workflow/utils/createNode";
import { serializeWorkflowInputsForApi } from "../workflow/utils/runPayload";
import type {
  NodeEdge,
  NodeEndpoint,
  WorkflowNode,
} from "../workflow/types";
import {
  clampAiNodeDimensions,
  findFirstCompatibleInputPort,
  getOutgoingDataType,
  migrateLegacyWorkflowGraph,
  resolveAiNodeInputs,
} from "../workflow/utils/unifiedGraph";

export const STORAGE_KEY = "AI_CANVAS_PRO_PROJECT_V2";

function endpointKey(e: NodeEndpoint): string {
  if (e.kind === "image-element") {
    return `img:${e.elementId}:${e.portId}`;
  }
  return `ai:${e.nodeId}:${e.portId}`;
}

export const fallback = {
  ref1: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1400",
  ref2: "https://images.unsplash.com/photo-1520509414578-d9cbf09933a1?w=1200",
  room1: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400",
  room2: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400",
  ui1: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200",
  ui2: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200",
};

export function getImageDefaults(): Pick<
  ImageElement,
  | "cropOffsetX"
  | "cropOffsetY"
  | "cropScale"
  | "cropRotation"
  | "flipX"
  | "flipY"
  | "cornerRadius"
  | "maskShape"
  | "filter"
  | "aiMask"
> {
  return {
    cropOffsetX: 0,
    cropOffsetY: 0,
    cropScale: 1,
    cropRotation: 0,
    flipX: false,
    flipY: false,
    cornerRadius: 0,
    maskShape: "rect",
    filter: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
    },
    aiMask: null,
  };
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const LOCAL_STORAGE_PERSIST_DEBOUNCE_MS = 600;

/** 超过此长度的 data: 图不写入 localStorage，避免 QuotaExceeded；刷新后大图需重新导入或重跑 */
const TINY_PERSIST_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type LocalPersistPayload = Pick<
  EditorState,
  "pages" | "activePageId" | "zoom" | "pan" | "quickToolbarConfig" | "editorMode"
>;

function shrinkLargeDataUrlsInPages(
  pages: Page[],
  maxDataUrlLength: number,
): void {
  for (const page of pages) {
    for (const el of page.elements) {
      if (
        el.type === "image" &&
        typeof el.src === "string" &&
        el.src.startsWith("data:") &&
        el.src.length > maxDataUrlLength
      ) {
        el.src = TINY_PERSIST_PNG;
      }
    }
    for (const node of page.aiNodes) {
      const outs = node.outputs;
      for (const key of Object.keys(outs)) {
        const v = outs[key];
        if (!v || typeof v !== "object" || !("type" in v)) continue;
        if (
          (v.type === "image" || v.type === "mask") &&
          "url" in v &&
          typeof (v as { url?: unknown }).url === "string"
        ) {
          const url = (v as { url: string }).url;
          if (url.startsWith("data:") && url.length > maxDataUrlLength) {
            (outs as Record<string, Record<string, unknown>>)[key] = {
              ...(v as Record<string, unknown>),
              url: TINY_PERSIST_PNG,
            };
          }
        }
      }
    }
  }
}

function stringifyPersistPayloadWithDataUrlCap(
  payload: LocalPersistPayload,
  maxDataUrlLength: number,
): string {
  const copy = clone(payload);
  shrinkLargeDataUrlsInPages(copy.pages, maxDataUrlLength);
  return JSON.stringify(copy);
}

function tryWriteProjectToLocalStorage(payload: LocalPersistPayload): void {
  let json: string;
  try {
    json = JSON.stringify(payload);
  } catch (e) {
    console.warn("[store] JSON.stringify for persist failed:", e);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, json);
    return;
  } catch (e) {
    const isQuota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.code === 22);
    if (!isQuota) {
      console.warn("[store] localStorage.setItem failed:", e);
      return;
    }
  }

  for (const maxLen of [120_000, 24_000, 4_000]) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        stringifyPersistPayloadWithDataUrlCap(payload, maxLen),
      );
      return;
    } catch {
      // stricter cap on next iteration
    }
  }
  console.warn(
    "[store] localStorage quota: project too large even after stripping long data URLs",
  );
}

/** 剪贴板：画布元素，或 AI 节点 + 节点之间的连线（不含指向画布图片的边） */
export type EditorClipboard =
  | { kind: "elements"; items: CanvasElement[] }
  | {
      kind: "workflow";
      nodes: WorkflowNode[];
      internalEdges: NodeEdge[];
    };

const EMPTY_ELEMENT_CLIPBOARD: EditorClipboard = {
  kind: "elements",
  items: [],
};

export function makeImage(src: string, name = "图片"): ImageElement {
  return {
    id: nanoid(),
    type: "image",
    name,
    x: 420,
    y: 320,
    width: 520,
    height: 320,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    src,
    ...getImageDefaults(),
  };
}

function migratePage(p: Page): Page {
  const elements = p.elements;
  let aiNodes = p.aiNodes ?? [];
  let edges = p.edges ?? [];

  if (p.workflow?.nodes?.length) {
    const m = migrateLegacyWorkflowGraph(p.workflow, elements);
    aiNodes = m.aiNodes;
    edges = m.edges;
  }

  const { workflow: _wf, aiNodes: _a0, edges: _e0, ...rest } = p;
  return {
    ...rest,
    elements,
    aiNodes: aiNodes.map((n) => clampAiNodeDimensions(n)),
    edges,
  };
}

function makeDefaultPage(): Page {
  return {
    id: nanoid(),
    name: "页面 1",
    elements: [],
    aiNodes: [],
    edges: [],
  };
}

function getBounds(elements: CanvasElement[]) {
  if (!elements.length) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  const left = Math.min(...elements.map((el) => el.x));
  const top = Math.min(...elements.map((el) => el.y));
  const right = Math.max(...elements.map((el) => el.x + el.width));
  const bottom = Math.max(...elements.map((el) => el.y + el.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    right,
    bottom,
    centerX: left + (right - left) / 2,
    centerY: top + (bottom - top) / 2,
  };
}

function getInitial(): EditorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as {
        pages?: Page[];
        activePageId?: string;
        zoom?: number;
        pan?: { x: number; y: number };
        quickToolbarConfig?: unknown;
        editorMode?: string;
      };
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        const pages = data.pages.map(migratePage);
        return {
          pages,
          activePageId: data.activePageId || pages[0]!.id,
          selectedIds: [],
          zoom: typeof data.zoom === "number" ? data.zoom : 0.45,
          pan: data.pan || { x: 0, y: 0 },
          tool: "select",
          editingTextId: null,
          quickToolbarConfig: mergeQuickToolbarConfig(data.quickToolbarConfig),
          editorMode: "canvas",
          selectedWorkflowNodeIds: [],
          workflowConnecting: {
            active: false,
            from: null,
            dataType: null,
            pointerX: 0,
            pointerY: 0,
          },
          workflowNodePicker: {
            open: false,
            x: 0,
            y: 0,
          },
        };
      }
    }
  } catch {
    /* ignore */
  }

  const page = makeDefaultPage();

  return {
    pages: [page],
    activePageId: page.id,
    selectedIds: [],
    zoom: 0.45,
    pan: { x: 0, y: 0 },
    tool: "select",
    editingTextId: null,
    quickToolbarConfig: { ...DEFAULT_QUICK_TOOLBAR_CONFIG },
    editorMode: "canvas",
    selectedWorkflowNodeIds: [],
    workflowConnecting: {
      active: false,
      from: null,
      dataType: null,
      pointerX: 0,
      pointerY: 0,
    },
    workflowNodePicker: { open: false, x: 0, y: 0 },
  };
}

type Snapshot = Pick<
  EditorState,
  | "pages"
  | "activePageId"
  | "selectedIds"
  | "selectedWorkflowNodeIds"
  | "zoom"
  | "pan"
>;

type Store = EditorState & {
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

function makeSnapshot(state: Store): Snapshot {
  return {
    pages: clone(state.pages),
    activePageId: state.activePageId,
    selectedIds: clone(state.selectedIds),
    selectedWorkflowNodeIds: clone(state.selectedWorkflowNodeIds),
    zoom: state.zoom,
    pan: clone(state.pan),
  };
}

export const useEditorStore = create<Store>((set, get) => ({
  ...getInitial(),

  marqueeSelecting: false,
  floatingToolbarSuppressed: false,

  historyPast: [],
  historyFuture: [],
  clipboard: EMPTY_ELEMENT_CLIPBOARD,

  getActivePage: () => {
    const state = get();
    return state.pages.find((p) => p.id === state.activePageId)!;
  },

  getSelectedElements: () => {
    const state = get();
    const page = state.getActivePage();
    return page.elements.filter((el) => state.selectedIds.includes(el.id));
  },

  commitHistory: () => {
    set(
      produce<Store>((state) => {
        state.historyPast.push(makeSnapshot(state));
        if (state.historyPast.length > 100) state.historyPast.shift();
        state.historyFuture = [];
      }),
    );
  },

  undo: () => {
    set(
      produce<Store>((state) => {
        const last = state.historyPast.pop();
        if (!last) return;

        state.historyFuture.push(makeSnapshot(state));

        state.pages = last.pages;
        state.activePageId = last.activePageId;
        state.selectedIds = last.selectedIds;
        state.selectedWorkflowNodeIds = last.selectedWorkflowNodeIds;
        state.zoom = last.zoom;
        state.pan = last.pan;
        state.editingTextId = null;
      }),
    );
  },

  redo: () => {
    set(
      produce<Store>((state) => {
        const next = state.historyFuture.pop();
        if (!next) return;

        state.historyPast.push(makeSnapshot(state));

        state.pages = next.pages;
        state.activePageId = next.activePageId;
        state.selectedIds = next.selectedIds;
        state.selectedWorkflowNodeIds = next.selectedWorkflowNodeIds;
        state.zoom = next.zoom;
        state.pan = next.pan;
        state.editingTextId = null;
      }),
    );
  },

  clearCanvasSelection: () =>
    set({ selectedIds: [], selectedWorkflowNodeIds: [] }),

  setSelectedIds: (ids) =>
    set((state) => ({
      selectedIds: ids,
      /** 选中画布元素时清空 AI 节点选区，避免 Copy/Delete 语义冲突 */
      selectedWorkflowNodeIds: ids.length > 0 ? [] : state.selectedWorkflowNodeIds,
      /** 新选区时清除，避免拖移/变换结束后标志残留导致浮动条永远不出现 */
      floatingToolbarSuppressed: false,
    })),

  updateElement: (id, patch, options) => {
    if (options?.history !== false) get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        const el = page?.elements.find((item) => item.id === id);
        if (!el) return;

        const patchKeys = Object.keys(patch) as (keyof CanvasElement)[];
        const allowedWhenLocked = new Set<keyof CanvasElement>([
          "locked",
          "visible",
        ]);
        if (
          el.locked &&
          !patchKeys.every((k) => allowedWhenLocked.has(k))
        ) {
          return;
        }

        Object.assign(el, patch);
      }),
    );
  },

  addElement: (element) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        page.elements.push(element);
        state.selectedIds = [element.id];
      }),
    );
  },

  removeSelected: () => {
    const wfIds = get().selectedWorkflowNodeIds;
    const elIds = get().selectedIds;
    if (!wfIds.length && !elIds.length) return;
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;

        const removedEls = new Set(state.selectedIds);
        if (removedEls.size > 0) {
          page.elements = page.elements.filter((el) => !removedEls.has(el.id));
        }

        const removedWf = new Set(state.selectedWorkflowNodeIds);
        if (removedWf.size > 0) {
          page.aiNodes = page.aiNodes.filter((n) => !removedWf.has(n.id));
        }

        page.edges = page.edges.filter((e) => {
          if (e.from.kind === "image-element" && removedEls.has(e.from.elementId)) {
            return false;
          }
          if (e.from.kind === "ai-node" && removedWf.has(e.from.nodeId)) {
            return false;
          }
          if (e.to.kind === "ai-node" && removedWf.has(e.to.nodeId)) {
            return false;
          }
          return true;
        });

        state.selectedIds = [];
        state.selectedWorkflowNodeIds = [];
      }),
    );
  },

  copy: () => {
    const state = get();
    const wfIds = state.selectedWorkflowNodeIds;
    if (wfIds.length > 0) {
      const idSet = new Set(wfIds);
      const page = state.getActivePage();
      const nodes = page.aiNodes
        .filter((n) => idSet.has(n.id))
        .map((n) => clone(n));
      const internalEdges = page.edges.filter((e) => {
        if (e.from.kind !== "ai-node" || e.to.kind !== "ai-node") return false;
        return idSet.has(e.from.nodeId) && idSet.has(e.to.nodeId);
      });
      set({
        clipboard: {
          kind: "workflow",
          nodes,
          internalEdges: internalEdges.map((e) => clone(e)),
        },
      });
      return;
    }

    const selected = get().getSelectedElements();
    set({ clipboard: { kind: "elements", items: clone(selected) } });
  },

  paste: () => {
    const clip = get().clipboard;

    if (clip.kind === "workflow" && clip.nodes.length > 0) {
      get().commitHistory();
      const now = Date.now();
      const idMap = new Map<string, string>();
      const newNodes: WorkflowNode[] = clip.nodes.map((n) => {
        const newId = nanoid();
        idMap.set(n.id, newId);
        const base = clone(n);
        const copyTitle = base.title.endsWith(" 副本") ? base.title : `${base.title} 副本`;
        return clampAiNodeDimensions({
          ...base,
          id: newId,
          title: copyTitle,
          x: base.x + 28,
          y: base.y + 28,
          status: "idle",
          outputs: {},
          error: undefined,
          createdAt: now,
          updatedAt: now,
        });
      });

      const newEdges: NodeEdge[] = [];
      for (const e of clip.internalEdges) {
        if (e.from.kind !== "ai-node" || e.to.kind !== "ai-node") continue;
        const fromId = idMap.get(e.from.nodeId);
        const toId = idMap.get(e.to.nodeId);
        if (!fromId || !toId) continue;
        const mapped: NodeEdge = {
          ...clone(e),
          id: nanoid(),
          from: { kind: "ai-node", nodeId: fromId, portId: e.from.portId },
          to: { kind: "ai-node", nodeId: toId, portId: e.to.portId },
          createdAt: now,
        };
        newEdges.push(mapped);
      }

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.aiNodes.push(...newNodes);
          for (const edge of newEdges) {
            if (
              page.edges.some(
                (ex) =>
                  endpointKey(ex.from) === endpointKey(edge.from) &&
                  endpointKey(ex.to) === endpointKey(edge.to),
              )
            ) {
              continue;
            }
            page.edges.push(edge);
          }
          state.selectedWorkflowNodeIds = newNodes.map((n) => n.id);
          state.selectedIds = [];
        }),
      );
      return;
    }

    if (clip.kind !== "elements" || !clip.items.length) return;

    get().commitHistory();

    const pasted = clip.items.map((el, index) => ({
      ...clone(el),
      id: nanoid(),
      name: `${el.name}_复制`,
      x: el.x + 30 + index * 8,
      y: el.y + 30 + index * 8,
      locked: false,
      parentId: null,
    })) as CanvasElement[];

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        page.elements.push(...pasted);
        state.selectedIds = pasted.map((el) => el.id);
        state.selectedWorkflowNodeIds = [];
      }),
    );
  },

  selectAll: () => {
    const page = get().getActivePage();
    set({
      selectedIds: page.elements
        .filter((el) => el.visible && !el.locked && !el.parentId)
        .map((el) => el.id),
    });
  },

  alignSelected: (type) => {
    const selected = get().getSelectedElements();
    if (selected.length < 2) return;

    get().commitHistory();

    const bounds = getBounds(selected);

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;

        for (const el of page.elements) {
          if (!state.selectedIds.includes(el.id) || el.locked) continue;

          if (type === "left") el.x = bounds.x;
          if (type === "right") el.x = bounds.right - el.width;
          if (type === "center") el.x = bounds.centerX - el.width / 2;
          if (type === "top") el.y = bounds.y;
          if (type === "bottom") el.y = bounds.bottom - el.height;
          if (type === "middle") el.y = bounds.centerY - el.height / 2;
        }
      }),
    );
  },

  distributeSelected: (type) => {
    const selected = get().getSelectedElements();
    if (selected.length < 3) return;

    get().commitHistory();

    const sorted =
      type === "horizontal"
        ? [...selected].sort((a, b) => a.x - b.x)
        : [...selected].sort((a, b) => a.y - b.y);

    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    if (type === "horizontal") {
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const gap =
        (last.x + last.width - first.x - totalWidth) / (sorted.length - 1);

      let cursor = first.x;

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;

          for (const item of sorted) {
            const el = page.elements.find((e) => e.id === item.id);
            if (!el || el.locked) continue;
            el.x = cursor;
            cursor += el.width + gap;
          }
        }),
      );
    } else {
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const gap =
        (last.y + last.height - first.y - totalHeight) / (sorted.length - 1);

      let cursor = first.y;

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;

          for (const item of sorted) {
            const el = page.elements.find((e) => e.id === item.id);
            if (!el || el.locked) continue;
            el.y = cursor;
            cursor += el.height + gap;
          }
        }),
      );
    }
  },

  groupSelected: () => {
    const selected = get().getSelectedElements();
    if (selected.length < 2) return;

    get().commitHistory();

    const bounds = getBounds(selected);
    const groupId = nanoid();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;

        for (const el of page.elements) {
          if (state.selectedIds.includes(el.id)) {
            el.parentId = groupId;
          }
        }

        page.elements.push({
          id: groupId,
          type: "group",
          name: "组合",
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          children: selected.map((el) => el.id),
        });

        state.selectedIds = [groupId];
      }),
    );
  },

  ungroupSelected: () => {
    const selected = get()
      .getSelectedElements()
      .filter((el) => el.type === "group");
    if (!selected.length) return;

    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;

        const groupIds = selected.map((el) => el.id);
        const childIds: string[] = [];

        for (const el of page.elements) {
          if (el.parentId && groupIds.includes(el.parentId)) {
            childIds.push(el.id);
            el.parentId = null;
          }
        }

        page.elements = page.elements.filter((el) => !groupIds.includes(el.id));
        state.selectedIds = childIds;
      }),
    );
  },

  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setTool: (tool) => set({ tool }),
  setEditingTextId: (id) => set({ editingTextId: id }),

  setQuickToolbarConfig: (scope, ids) => {
    set(
      produce<Store>((state) => {
        state.quickToolbarConfig[scope] = normalizeQuickToolbarIds(ids, scope);
      }),
    );
  },

  setMarqueeSelecting: (v) => set({ marqueeSelecting: v }),

  setFloatingToolbarSuppressed: (v) => set({ floatingToolbarSuppressed: v }),

  replaceImageKeepFrame: (id, src) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        const el = page?.elements.find((item) => item.id === id);
        if (!el || el.type !== "image") return;

        el.src = src;
        el.cropOffsetX = 0;
        el.cropOffsetY = 0;
        el.cropScale = 1;
        el.cropRotation = 0;
        el.flipX = false;
        el.flipY = false;
        el.aiMask = null;
      }),
    );
  },

  setImageAIMask: (id, mask) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        const el = page?.elements.find((item) => item.id === id);
        if (!el || el.type !== "image") return;
        el.aiMask = mask;
      }),
    );
  },

  clearImageAIMask: (id) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        const el = page?.elements.find((item) => item.id === id);
        if (!el || el.type !== "image") return;
        el.aiMask = null;
      }),
    );
  },

  bringForward: (id) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        const index = page.elements.findIndex((el) => el.id === id);
        if (index < 0 || index >= page.elements.length - 1) return;
        const item = page.elements[index]!;
        page.elements[index] = page.elements[index + 1]!;
        page.elements[index + 1] = item;
      }),
    );
  },

  sendBackward: (id) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        const index = page.elements.findIndex((el) => el.id === id);
        if (index <= 0) return;
        const item = page.elements[index]!;
        page.elements[index] = page.elements[index - 1]!;
        page.elements[index - 1] = item;
      }),
    );
  },

  bringToFront: (id) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        const index = page.elements.findIndex((el) => el.id === id);
        if (index < 0) return;
        const [item] = page.elements.splice(index, 1);
        if (item) page.elements.push(item);
      }),
    );
  },

  sendToBack: (id) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        const index = page.elements.findIndex((el) => el.id === id);
        if (index < 0) return;
        const [item] = page.elements.splice(index, 1);
        if (item) page.elements.unshift(item);
      }),
    );
  },

  addPage: () => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page: Page = {
          id: nanoid(),
          name: `页面 ${state.pages.length + 1}`,
          elements: [],
          aiNodes: [],
          edges: [],
        };
        state.pages.push(page);
        state.activePageId = page.id;
        state.selectedIds = [];
      }),
    );
  },

  duplicatePage: (id) => {
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === id);
        if (!page) return;

        const copy = migratePage(clone(page));
        copy.id = nanoid();
        copy.name = `${page.name}_复制`;

        const elIdMap = new Map<string, string>();
        copy.elements = copy.elements.map((el) => {
          const nid = nanoid();
          elIdMap.set(el.id, nid);
          return {
            ...el,
            id: nid,
            parentId: null,
          };
        });

        const nodeIdMap = new Map<string, string>();
        copy.aiNodes = copy.aiNodes.map((n) => {
          const nid = nanoid();
          nodeIdMap.set(n.id, nid);
          return clampAiNodeDimensions({ ...n, id: nid });
        });

        copy.edges = copy.edges.map((e) => ({
          ...e,
          id: nanoid(),
          from:
            e.from.kind === "image-element"
              ? {
                  ...e.from,
                  elementId: elIdMap.get(e.from.elementId) ?? e.from.elementId,
                }
              : {
                  ...e.from,
                  nodeId: nodeIdMap.get(e.from.nodeId) ?? e.from.nodeId,
                },
          to:
            e.to.kind === "image-element"
              ? {
                  ...e.to,
                  elementId: elIdMap.get(e.to.elementId) ?? e.to.elementId,
                }
              : {
                  ...e.to,
                  nodeId: nodeIdMap.get(e.to.nodeId) ?? e.to.nodeId,
                },
        }));

        state.pages.push(copy);
        state.activePageId = copy.id;
        state.selectedIds = [];
        state.selectedWorkflowNodeIds = [];
      }),
    );
  },

  removePage: (id) => {
    if (get().pages.length <= 1) return;
    get().commitHistory();

    set(
      produce<Store>((state) => {
        state.pages = state.pages.filter((p) => p.id !== id);
        if (state.activePageId === id) {
          state.activePageId = state.pages[0]!.id;
        }
        state.selectedIds = [];
        state.selectedWorkflowNodeIds = [];
      }),
    );
  },

  renamePage: (id, name) => {
    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === id);
        if (page) page.name = name;
      }),
    );
  },

  setActivePageId: (id) => {
    set({
      activePageId: id,
      selectedIds: [],
      editingTextId: null,
      selectedWorkflowNodeIds: [],
    });
  },

  exportProjectJSON: () => {
    const state = get();
    return {
      version: "2.0.0",
      savedAt: new Date().toISOString(),
      pages: clone(state.pages),
      activePageId: state.activePageId,
    };
  },

  loadProjectJSON: (json) => {
    if (!json.pages?.length) return;

    get().commitHistory();

    set(
      produce<Store>((state) => {
        state.pages = clone(json.pages).map(migratePage);
        state.activePageId = json.activePageId || json.pages[0]!.id;
        state.selectedIds = [];
        state.editingTextId = null;
        state.historyPast = [];
        state.historyFuture = [];
        state.selectedWorkflowNodeIds = [];
      }),
    );
  },

  saveLocal: () => {
    const state = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pages: state.pages,
        activePageId: state.activePageId,
        zoom: state.zoom,
        pan: state.pan,
        quickToolbarConfig: state.quickToolbarConfig,
        editorMode: state.editorMode,
      }),
    );
  },

  saveRemote: async (url) => {
    const json = get().exportProjectJSON();
    const body = JSON.stringify(json);
    logApiEvent("request", `POST ${url}`, {
      bodyBytes: body.length,
      pages: json.pages?.length,
    });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });
      const text = await res.text();
      logApiEvent("response", `POST ${url} HTTP ${res.status}`, {
        ok: res.ok,
        bodyHead: text.slice(0, 500),
        bodyLength: text.length,
      });
    } catch (e) {
      logApiEvent("error", `POST ${url}`, {
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  loadRemote: async (url) => {
    logApiEvent("request", `GET ${url}`, {});
    try {
      const res = await fetch(url);
      const text = await res.text();
      logApiEvent("response", `GET ${url} HTTP ${res.status}`, {
        ok: res.ok,
        bodyLength: text.length,
      });
      const parsed = JSON.parse(text) as ProjectJSON;
      get().loadProjectJSON(parsed);
    } catch (e) {
      logApiEvent("error", `GET ${url}`, {
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  setEditorMode: () =>
    set({
      editorMode: "canvas",
    }),

  setSelectedWorkflowNodeIds: (ids) =>
    set((state) => ({
      selectedWorkflowNodeIds: ids,
      /** 选中 AI 节点时清空画布元素选区 */
      selectedIds: ids.length > 0 ? [] : state.selectedIds,
    })),

  addWorkflowNode: (node) => {
    get().commitHistory();
    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        page.aiNodes.push(clampAiNodeDimensions(node));
      }),
    );
  },

  updateWorkflowNode: (nodeId, patch, options) => {
    if (options?.history !== false) get().commitHistory();
    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        const node = page?.aiNodes.find((n) => n.id === nodeId);
        if (!node) return;
        Object.assign(node, patch, { updatedAt: Date.now() });
        const c = clampAiNodeDimensions(node);
        node.width = c.width;
        node.height = c.height;
      }),
    );
  },

  removeWorkflowNode: (nodeId) => {
    get().commitHistory();
    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        page.aiNodes = page.aiNodes.filter((n) => n.id !== nodeId);
        page.edges = page.edges.filter((e) => {
          if (e.from.kind === "ai-node" && e.from.nodeId === nodeId) {
            return false;
          }
          if (e.to.kind === "ai-node" && e.to.nodeId === nodeId) {
            return false;
          }
          return true;
        });
        state.selectedWorkflowNodeIds = state.selectedWorkflowNodeIds.filter(
          (id) => id !== nodeId,
        );
      }),
    );
  },

  addWorkflowEdge: (edge) => {
    get().commitHistory();
    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        if (
          page.edges.some(
            (e) =>
              endpointKey(e.from) === endpointKey(edge.from) &&
              endpointKey(e.to) === endpointKey(edge.to),
          )
        ) {
          return;
        }
        page.edges.push(edge);
      }),
    );
  },

  removeWorkflowEdge: (edgeId) => {
    get().commitHistory();
    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        page.edges = page.edges.filter((e) => e.id !== edgeId);
      }),
    );
  },

  startWorkflowConnecting: (from, pointerX, pointerY) => {
    const page = get().getActivePage();
    const dt = getOutgoingDataType(from, page);
    if (!dt) return;
    set({
      workflowConnecting: {
        active: true,
        from,
        dataType: dt,
        pointerX,
        pointerY,
      },
    });
  },

  updateWorkflowConnectingPointer: (pointerX, pointerY) => {
    const c = get().workflowConnecting;
    if (!c.active) return;
    set({
      workflowConnecting: {
        ...c,
        pointerX,
        pointerY,
      },
    });
  },

  cancelWorkflowConnecting: () =>
    set({
      workflowConnecting: {
        active: false,
        from: null,
        dataType: null,
        pointerX: 0,
        pointerY: 0,
      },
    }),

  completeWorkflowConnectingToInput: (to) => {
    const c = get().workflowConnecting;
    if (!c.active || !c.from || !c.dataType) return;
    if (to.kind !== "ai-node") return;

    const page = get().getActivePage();
    const node = page.aiNodes.find((n) => n.id === to.nodeId);
    if (!node) return;
    const def = getWorkflowNodeDefinition(node.type);
    const inp = def.inputs.find((i) => i.id === to.portId);
    if (!inp || inp.dataType !== c.dataType) return;

    const fromEp = c.from;

    const dup = page.edges.some(
      (ex) =>
        endpointKey(ex.from) === endpointKey(fromEp) &&
        endpointKey(ex.to) === endpointKey(to),
    );
    if (dup) {
      get().cancelWorkflowConnecting();
      return;
    }

    get().commitHistory();
    set(
      produce<Store>((state) => {
        const pg = state.pages.find((p) => p.id === state.activePageId);
        if (!pg) return;
        if (!inp.multiple) {
          pg.edges = pg.edges.filter(
            (e) =>
              !(
                e.to.kind === "ai-node" &&
                e.to.nodeId === to.nodeId &&
                e.to.portId === to.portId
              ),
          );
        }
        pg.edges.push({
          id: nanoid(),
          from: fromEp,
          to,
          dataType: c.dataType!,
          createdAt: Date.now(),
        });
      }),
    );
    get().cancelWorkflowConnecting();
  },

  openWorkflowNodePicker: (x, y) => {
    const c = get().workflowConnecting;
    set({
      workflowNodePicker: {
        open: true,
        x,
        y,
        from: c.from ?? undefined,
        dataType: c.dataType ?? undefined,
      },
      workflowConnecting: {
        active: false,
        from: null,
        dataType: null,
        pointerX: 0,
        pointerY: 0,
      },
    });
  },

  openWorkflowNodePickerAtWorld: (x, y) => {
    set({
      workflowConnecting: {
        active: false,
        from: null,
        dataType: null,
        pointerX: 0,
        pointerY: 0,
      },
      workflowNodePicker: {
        open: true,
        x,
        y,
      },
    });
  },

  closeWorkflowNodePicker: () =>
    set({
      workflowNodePicker: {
        open: false,
        x: 0,
        y: 0,
      },
    }),

  createWorkflowNodeFromPicker: (type) => {
    const pick = get().workflowNodePicker;
    const conn = get().workflowConnecting;
    const pageBefore = get().getActivePage();
    const edgesBefore = pageBefore.edges;

    get().commitHistory();
    const newNode = createWorkflowNode(type, pick.x - 40, pick.y - 20);
    const edgeToAdd: NodeEdge | null = (() => {
      const from = pick.from ?? conn.from;
      if (!from) return null;
      const dt = pick.dataType ?? conn.dataType;
      if (!dt) return null;
      const def = getWorkflowNodeDefinition(type);
      const slot = findFirstCompatibleInputPort(
        def,
        dt,
        edgesBefore,
        newNode.id,
      );
      if (!slot) return null;
      return {
        id: nanoid(),
        from,
        to: { kind: "ai-node" as const, nodeId: newNode.id, portId: slot.portId },
        dataType: dt,
        createdAt: Date.now(),
      };
    })();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;
        page.aiNodes.push(clampAiNodeDimensions(newNode));
        if (edgeToAdd) page.edges.push(edgeToAdd);
        state.selectedWorkflowNodeIds = [newNode.id];
      }),
    );

    get().cancelWorkflowConnecting();
    get().closeWorkflowNodePicker();
  },

  runWorkflowNode: async (nodeId) => {
    const page = get().getActivePage();
    const node = page.aiNodes.find((n) => n.id === nodeId);
    if (!node) return;
    const def = getWorkflowNodeDefinition(node.type);

    /** 客户端同步：把上游连线上的图像写入本节点 outputs，不请求后端 */
    if (node.type === "output-view") {
      try {
        const inputs = resolveAiNodeInputs(nodeId, page);
        const src = inputs.source;
        if (
          !src ||
          typeof src !== "object" ||
          (src as { type?: string }).type !== "image"
        ) {
          throw new Error("请先连接上游「图像」输出端口");
        }
        const img = src as { type: "image"; url: string; width?: number; height?: number };
        if (!img.url) throw new Error("上游图像缺少 url");
        get().updateWorkflowNode(
          nodeId,
          {
            status: "success",
            outputs: {
              result: {
                type: "image",
                url: img.url,
                width: img.width,
                height: img.height,
              },
            },
            error: undefined,
            updatedAt: Date.now(),
          },
          { history: false },
        );
        get().commitHistory();
      } catch (e) {
        get().updateWorkflowNode(
          nodeId,
          {
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          },
          { history: false },
        );
      }
      return;
    }

    if (def.executor === "none") return;

    let inputsSerialized: Record<string, unknown>;
    try {
      inputsSerialized = serializeWorkflowInputsForApi(nodeId, page);
    } catch (e) {
      get().updateWorkflowNode(
        nodeId,
        {
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        },
        { history: false },
      );
      return;
    }

    get().updateWorkflowNode(
      nodeId,
      { status: "running", error: undefined },
      { history: false },
    );

    const traceId = nanoid();
    try {
      const res = await fetch("/api/workflow/run-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: node.type,
          inputs: inputsSerialized,
          params: node.params,
          traceId,
        }),
      });
      const text = await res.text();
      let data: { outputs?: Record<string, unknown>; detail?: unknown };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        throw new Error(`非 JSON 响应: ${text.slice(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `HTTP ${res.status}`,
        );
      }
      const outs = (data.outputs ?? {}) as WorkflowNode["outputs"];
      get().updateWorkflowNode(
        nodeId,
        {
          status: "success",
          outputs: outs,
          updatedAt: Date.now(),
        },
        { history: false },
      );
      get().commitHistory();
    } catch (e) {
      get().updateWorkflowNode(
        nodeId,
        {
          status: "error",
          error: e instanceof Error ? e.message : "运行失败",
        },
        { history: false },
      );
    }
  },

  sendWorkflowResultToCanvas: (nodeId, outputKey = "result") => {
    const page = get().getActivePage();
    const node = page.aiNodes.find((n) => n.id === nodeId);
    const out = node?.outputs[outputKey];
    if (!out || out.type !== "image" || !("url" in out)) return;
    const url = out.url;
    get().addElement({
      ...makeImage(String(url), "工作流输出"),
      x: (node?.x ?? 0) + (node?.width ?? 280) + 40,
      y: node?.y ?? 200,
    } as CanvasElement);
  },
}));

let localStoragePersistTimer: ReturnType<typeof setTimeout> | null = null;

useEditorStore.subscribe(() => {
  if (localStoragePersistTimer !== null) {
    clearTimeout(localStoragePersistTimer);
  }
  localStoragePersistTimer = setTimeout(() => {
    localStoragePersistTimer = null;
    const state = useEditorStore.getState();
    tryWriteProjectToLocalStorage({
      pages: state.pages,
      activePageId: state.activePageId,
      zoom: state.zoom,
      pan: state.pan,
      quickToolbarConfig: state.quickToolbarConfig,
      editorMode: state.editorMode,
    });
  }, LOCAL_STORAGE_PERSIST_DEBOUNCE_MS);
});
