import { produce } from "immer";
import {
  needsPersistImageSrc,
  persistImageSrcToOss,
} from "../../images/persistImageSrc";
import {
  normalizeImageFilter,
  type ImageFilter,
} from "../../image-filter/imageFilter";
import { buildGridSplitElements } from "../../../image-tools/grid-split/splitImageToGrid";
import type { CanvasElement, ImageMaskData } from "../../types";
import type { Store } from "../types";
import type { StoreGet, StoreSet } from "../sliceTypes";

function scheduleImageSrcPersist(
  get: StoreGet,
  elementId: string,
  expectedSrc: string,
) {
  if (!needsPersistImageSrc(expectedSrc)) return;

  void persistImageSrcToOss(expectedSrc, { apiName: "canvas-image" })
    .then((url) => {
      const page = get().pages.find((p) => p.id === get().activePageId);
      const el = page?.elements.find((item) => item.id === elementId);
      if (el?.type === "image" && el.src === expectedSrc) {
        get().updateElement(elementId, { src: url }, { history: false });
      }
    })
    .catch((err) => {
      console.warn("[persistImageSrc] upload failed:", err);
    });
}

export function createElementSlice(set: StoreSet, get: StoreGet) {
  return {
    getActivePage: () => {
      const state = get();
      return state.pages.find((p) => p.id === state.activePageId)!;
    },

    getSelectedElements: () => {
      const state = get();
      const page = state.getActivePage();
      return page.elements.filter((el) => state.selectedIds.includes(el.id));
    },

    updateElement: (
      id: string,
      patch: Partial<CanvasElement>,
      options?: { history?: boolean },
    ) => {
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

          if (
            el.type === "image" &&
            (patch as Partial<{ filter?: ImageFilter }>).filter
          ) {
            const nextFilter = (patch as { filter: ImageFilter }).filter;
            el.filter = {
              ...normalizeImageFilter(el.filter),
              ...nextFilter,
            };
            const rest = { ...patch } as Record<string, unknown>;
            delete rest.filter;
            Object.assign(el, rest);
          } else {
            Object.assign(el, patch);
          }

          if (
            el.type === "image" &&
            typeof (patch as Partial<{ src?: string }>).src === "string"
          ) {
            scheduleImageSrcPersist(
              get,
              id,
              (patch as { src: string }).src,
            );
          }
        }),
      );
    },

    addElement: (element: CanvasElement) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.elements.push(element);
          state.selectedIds = [element.id];
        }),
      );

      if (element.type === "image") {
        scheduleImageSrcPersist(get, element.id, element.src);
      }
    },

    removeSelected: () => {
      const wfIds = get().selectedWorkflowNodeIds;
      const elIds = get().selectedIds;
      if (!wfIds.length && !elIds.length) return;

      const page = get().getActivePage();
      const removableElCount = elIds.filter((id) => {
        const el = page.elements.find((e) => e.id === id);
        return el && !el.locked;
      }).length;
      if (!wfIds.length && !removableElCount) return;

      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;

          const removableEls = new Set(
            state.selectedIds.filter((id) => {
              const el = page!.elements.find((e) => e.id === id);
              return el && !el.locked;
            }),
          );
          if (removableEls.size > 0) {
            page.elements = page.elements.filter((el) => !removableEls.has(el.id));
          }

          const removedWf = new Set(state.selectedWorkflowNodeIds);
          if (removedWf.size > 0) {
            page.aiNodes = page.aiNodes.filter((n) => !removedWf.has(n.id));
          }

          page.edges = page.edges.filter((e) => {
            if (
              e.from.kind === "image-element" &&
              removableEls.has(e.from.elementId)
            ) {
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

          state.selectedIds = state.selectedIds.filter((id) => !removableEls.has(id));
          state.selectedWorkflowNodeIds = [];
        }),
      );
    },

    replaceImageKeepFrame: (id: string, src: string) => {
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

      scheduleImageSrcPersist(get, id, src);
    },

    /** 按原图比例重算外框（不换 src，用于修复旧 520×320 图层） */
    fitImageFrame: (id: string, size: { width: number; height: number }) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          const el = page?.elements.find((item) => item.id === id);
          if (!el || el.type !== "image") return;

          el.width = Math.max(5, Math.round(size.width));
          el.height = Math.max(5, Math.round(size.height));
          el.cropOffsetX = 0;
          el.cropOffsetY = 0;
          el.cropScale = 1;
          el.cropRotation = 0;
        }),
      );
    },

    /** 换图并按原图比例重算外框（拖入替换、导入长图/竖图时使用） */
    replaceImageFitFrame: (id: string, src: string, size: { width: number; height: number }) => {
      get().commitHistory();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          const el = page?.elements.find((item) => item.id === id);
          if (!el || el.type !== "image") return;

          el.src = src;
          el.width = Math.max(5, Math.round(size.width));
          el.height = Math.max(5, Math.round(size.height));
          el.cropOffsetX = 0;
          el.cropOffsetY = 0;
          el.cropScale = 1;
          el.cropRotation = 0;
          el.flipX = false;
          el.flipY = false;
          el.aiMask = null;
        }),
      );

      scheduleImageSrcPersist(get, id, src);
    },

    setImageAIMask: (id: string, mask: ImageMaskData | null) => {
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

    clearImageAIMask: (id: string) => {
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

    /** 将图片按 rows×cols 切分，在右侧生成对应宫格图层（单次 undo） */
    splitImageToGrid: async (id: string, rows: number, cols: number) => {
      const page = get().getActivePage();
      const el = page.elements.find((item) => item.id === id);
      if (!el || el.type !== "image" || el.locked) {
        throw new Error("请选择未锁定的图片图层");
      }

      const pieces = await buildGridSplitElements(el, { rows, cols });
      if (!pieces.length) {
        throw new Error("切分失败，未生成任何宫格");
      }

      get().commitHistory();

      const newIds = pieces.map((p) => p.id);
      set(
        produce<Store>((state) => {
          const pg = state.pages.find((p) => p.id === state.activePageId);
          if (!pg) return;
          pg.elements.push(...pieces);
          state.selectedIds = newIds;
        }),
      );

      for (const piece of pieces) {
        scheduleImageSrcPersist(get, piece.id, piece.src);
      }

      return newIds;
    },
  };
}
