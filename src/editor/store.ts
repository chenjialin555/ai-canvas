import { create } from "zustand";
import { produce } from "immer";
import { nanoid } from "nanoid";
import { logApiEvent } from "../lib/apiDebug";
import type {
  CanvasElement,
  EditorState,
  ImageElement,
  ImageMaskData,
  Page,
  ProjectJSON,
  ToolType,
} from "./types";

export const STORAGE_KEY = "AI_CANVAS_PRO_PROJECT_V2";

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

function makeDefaultPage(): Page {
  return {
    id: nanoid(),
    name: "页面 1",
    elements: [],
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
      };
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        return {
          pages: data.pages,
          activePageId: data.activePageId || data.pages[0]!.id,
          selectedIds: [],
          zoom: typeof data.zoom === "number" ? data.zoom : 0.45,
          pan: data.pan || { x: 0, y: 0 },
          tool: "select",
          editingTextId: null,
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
  };
}

type Snapshot = Pick<
  EditorState,
  "pages" | "activePageId" | "selectedIds" | "zoom" | "pan"
>;

type Store = EditorState & {

  historyPast: Snapshot[];
  historyFuture: Snapshot[];

  clipboard: CanvasElement[];

  getActivePage: () => Page;
  getSelectedElements: () => CanvasElement[];

  commitHistory: () => void;
  undo: () => void;
  redo: () => void;

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
};

function makeSnapshot(state: Store): Snapshot {
  return {
    pages: clone(state.pages),
    activePageId: state.activePageId,
    selectedIds: clone(state.selectedIds),
    zoom: state.zoom,
    pan: clone(state.pan),
  };
}

export const useEditorStore = create<Store>((set, get) => ({
  ...getInitial(),

  historyPast: [],
  historyFuture: [],
  clipboard: [],

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
        state.zoom = next.zoom;
        state.pan = next.pan;
        state.editingTextId = null;
      }),
    );
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  updateElement: (id, patch, options) => {
    if (options?.history !== false) get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        const el = page?.elements.find((item) => item.id === id);
        if (!el || el.locked) return;
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
    if (!get().selectedIds.length) return;
    get().commitHistory();

    set(
      produce<Store>((state) => {
        const page = state.pages.find((p) => p.id === state.activePageId);
        if (!page) return;

        page.elements = page.elements.filter(
          (el) => !state.selectedIds.includes(el.id),
        );
        state.selectedIds = [];
      }),
    );
  },

  copy: () => {
    const selected = get().getSelectedElements();
    set({ clipboard: clone(selected) });
  },

  paste: () => {
    const clipboard = get().clipboard;
    if (!clipboard.length) return;

    get().commitHistory();

    const pasted = clipboard.map((el, index) => ({
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

        const copy = clone(page);
        copy.id = nanoid();
        copy.name = `${page.name}_复制`;
        copy.elements = copy.elements.map((el) => ({
          ...el,
          id: nanoid(),
          parentId: null,
        }));

        state.pages.push(copy);
        state.activePageId = copy.id;
        state.selectedIds = [];
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
        state.pages = clone(json.pages);
        state.activePageId = json.activePageId || json.pages[0]!.id;
        state.selectedIds = [];
        state.editingTextId = null;
        state.historyPast = [];
        state.historyFuture = [];
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
}));

useEditorStore.subscribe(() => {
  const state = useEditorStore.getState();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      pages: state.pages,
      activePageId: state.activePageId,
      zoom: state.zoom,
      pan: state.pan,
    }),
  );
});
