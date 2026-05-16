import { useEffect } from "react";
import { useEditorStore } from "../../editor/store";

function isTypingTarget() {
  const tag = (document.activeElement?.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export type UseStageKeyboardShortcutsOptions = {
  /** 按住空格时进入画布平移模式 */
  onSpacePanChange: (active: boolean) => void;
};

/**
 * 画布级快捷键：撤销/重做、复制粘贴、全选、删除、Esc 取消连线等。
 * 文本输入框聚焦时不拦截按键。
 */
export function useStageKeyboardShortcuts(
  options: UseStageKeyboardShortcutsOptions,
) {
  const { onSpacePanChange } = options;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget()) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) onSpacePanChange(true);
        return;
      }

      const state = useEditorStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        state.undo();
      } else if (
        (ctrl && e.key.toLowerCase() === "z" && e.shiftKey) ||
        (ctrl && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        state.redo();
      } else if (ctrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        state.copy();
      } else if (ctrl && e.key.toLowerCase() === "v") {
        e.preventDefault();
        state.paste();
      } else if (ctrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        state.selectAll();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        state.removeSelected();
      } else if (e.key === "Escape") {
        state.cancelWorkflowConnecting();
        state.closeWorkflowNodePicker();
        state.clearCanvasSelection();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") onSpacePanChange(false);
    }

    function onBlur() {
      onSpacePanChange(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [onSpacePanChange]);
}
