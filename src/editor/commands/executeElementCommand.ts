import { useEditorStore } from "../store";
import type { CanvasElement } from "../types";
import type { ElementCommand } from "./types";

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
    case "copy":
      store.copy();
      break;
    case "paste":
      store.paste();
      break;
    case "bringToFront":
      store.bringToFront(cmd.id);
      break;
    case "sendToBack":
      store.sendToBack(cmd.id);
      break;
    case "bringForward":
      store.bringForward(cmd.id);
      break;
    case "sendBackward":
      store.sendBackward(cmd.id);
      break;
    case "toggleLock": {
      const page = store.getActivePage();
      const el = page.elements.find((e) => e.id === cmd.id);
      if (!el) break;
      store.updateElement(cmd.id, { locked: !el.locked } as Partial<CanvasElement>);
      break;
    }
    case "toggleVisible": {
      const page = store.getActivePage();
      const el = page.elements.find((e) => e.id === cmd.id);
      if (!el) break;
      store.updateElement(cmd.id, { visible: !el.visible } as Partial<CanvasElement>);
      break;
    }
    case "renameElement":
      store.updateElement(cmd.id, { name: cmd.name } as Partial<CanvasElement>);
      break;
    case "groupSelected":
      store.groupSelected();
      break;
    case "ungroupSelected":
      store.ungroupSelected();
      break;
    case "alignSelected":
      store.alignSelected(cmd.align);
      break;
    case "distributeSelected":
      store.distributeSelected(cmd.distribute);
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
