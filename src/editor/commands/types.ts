import type { CanvasElement, ImageMaskData } from "../types";

/**
 * 元素侧命令描述（当前仍以全量快照 undo/redo 为主；本类型供统一入口与未来扩展）。
 */
export type ElementCommand =
  | { type: "addElement"; element: CanvasElement }
  | {
      type: "updateElement";
      id: string;
      patch: Partial<CanvasElement>;
      /** 默认 true，与 store.updateElement 一致 */
      history?: boolean;
    }
  | { type: "removeSelected" }
  | { type: "replaceImageKeepFrame"; id: string; src: string }
  | { type: "setImageAIMask"; id: string; mask: ImageMaskData | null }
  | { type: "clearImageAIMask"; id: string };
