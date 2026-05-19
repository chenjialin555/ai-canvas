import type { CanvasElement } from "../../features/editor/types";
import type { WorkflowNode } from "../../features/workflow/model/types";

export type ContextMenuTargetKind = "empty" | "element" | "workflow-node";

export type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
  targetKind: ContextMenuTargetKind;
};

type Props = {
  menu: ContextMenuState;
  /** 当前主选中的画布元素（工作流右键时可能为空） */
  selected?: CanvasElement | null;
  /** 工作流节点右键时的节点（画布元素右键时为空） */
  workflowNode?: WorkflowNode | null;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onExportPng: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onLock: () => void;
  onToggleVisible: () => void;
  onFitImageAspect?: () => void;
  onClearMask?: () => void;
  onAddToAiChat?: () => void;
};

export function ContextMenu(props: Props) {
  const { menu, selected } = props;
  const wf = menu.targetKind === "workflow-node";

  if (!menu.visible) return null;

  return (
    <div
      className="context-menu"
      style={{
        left: menu.x,
        top: menu.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button type="button" onClick={props.onCopy}>
        复制
      </button>
      <button type="button" onClick={props.onPaste}>
        粘贴
      </button>

      {!wf && (
        <>
          <div className="context-line" />

          <button type="button" onClick={props.onBringToFront}>
            置顶
          </button>
          <button type="button" onClick={props.onSendToBack}>
            置底
          </button>

          <div className="context-line" />

          <button type="button" onClick={props.onGroup}>
            组合
          </button>
          <button type="button" onClick={props.onUngroup}>
            取消组合
          </button>

          <div className="context-line" />

          {selected?.type === "image" && (
            <>
              <button type="button" onClick={props.onExportPng}>
                导出PNG
              </button>
              {props.onFitImageAspect && (
                <button type="button" onClick={props.onFitImageAspect}>
                  适应图片比例
                </button>
              )}
              {selected.aiMask && props.onClearMask && (
                <button type="button" onClick={props.onClearMask}>
                  清除 AI 蒙版
                </button>
              )}
            </>
          )}

          {selected?.type === "image" && props.onAddToAiChat && (
            <>
              <div className="context-line" />
              <button type="button" onClick={props.onAddToAiChat}>
                加入 AI 对话
              </button>
            </>
          )}

          <button type="button" onClick={props.onLock}>
            锁定 / 解锁
          </button>
          <button type="button" onClick={props.onToggleVisible}>
            {selected?.visible === false ? "显示" : "隐藏"}
          </button>
        </>
      )}

      {wf && props.workflowNode && (
        <>
          <div className="context-line" />
          <p className="context-menu-hint">
            节点：{props.workflowNode.title}
          </p>
        </>
      )}

      <div className="context-line" />

      <button type="button" className="danger" onClick={props.onDelete}>
        删除
      </button>
    </div>
  );
}
