import { useEditorStore } from "../../../features/editor/store";
import type { ElementCommand } from "../../../features/editor/commands/types";

/**
 * 将元素类操作经单一入口分派到 Zustand（内部仍使用现有 slice 与 commitHistory 语义）。
 */
export function executeElementCommand(cmd: ElementCommand): void {
  const store = useEditorStore.getState();
  switch (cmd.type) {
    case "addElement":
      store.addElement(cmd.element);
      break;
    case "updateElement":
      store.updateElement(cmd.id, cmd.patch, {
        history: cmd.history ?? true,
      });
      break;
    case "removeSelected":
      store.removeSelected();
      break;
    case "replaceImageKeepFrame":
      store.replaceImageKeepFrame(cmd.id, cmd.src);
      break;
    case "setImageAIMask":
      store.setImageAIMask(cmd.id, cmd.mask);
      break;
    case "clearImageAIMask":
      store.clearImageAIMask(cmd.id);
      break;
  }
}
