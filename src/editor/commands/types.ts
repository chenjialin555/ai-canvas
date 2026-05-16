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
  | { type: "copy" }
  | { type: "paste" }
  | { type: "bringToFront"; id: string }
  | { type: "sendToBack"; id: string }
  | { type: "bringForward"; id: string }
  | { type: "sendBackward"; id: string }
  | { type: "toggleLock"; id: string }
  | { type: "toggleVisible"; id: string }
  | { type: "renameElement"; id: string; name: string }
  | { type: "groupSelected" }
  | { type: "ungroupSelected" }
  | {
      type: "alignSelected";
      align: "left" | "center" | "right" | "top" | "middle" | "bottom";
    }
  | { type: "distributeSelected"; distribute: "horizontal" | "vertical" }
  | { type: "replaceImageKeepFrame"; id: string; src: string }
  | { type: "setImageAIMask"; id: string; mask: ImageMaskData | null }
  | { type: "clearImageAIMask"; id: string };
