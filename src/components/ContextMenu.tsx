import type { CanvasElement } from "../editor/types";

export type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
};

type Props = {
  menu: ContextMenuState;
  selected?: CanvasElement | null;
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
  onHide: () => void;
  onCrop: () => void;
  onOpenAI: () => void;
  onEditMask: () => void;
  onClearMask?: () => void;
  onAddToAiChat?: () => void;
};

export function ContextMenu(props: Props) {
  const { menu, selected } = props;

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
          <button type="button" onClick={props.onCrop}>
            裁剪图片
          </button>
          <button type="button" onClick={props.onOpenAI}>
            AI 生图编辑
          </button>
          <button type="button" onClick={props.onEditMask}>
            {selected.aiMask ? "编辑蒙版" : "添加蒙版"}
          </button>
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
      <button type="button" onClick={props.onHide}>
        隐藏
      </button>

      <div className="context-line" />

      <button type="button" className="danger" onClick={props.onDelete}>
        删除
      </button>
    </div>
  );
}
