import { AiChatPanel } from "../components/AiChatPanel";
import { executeElementCommand } from "../editor/commands/executeElementCommand";
import { exportCroppedImageAsPNG } from "../editor/export";
import { useEditorStore } from "../editor/store";
import type { CanvasElement, ImageElement } from "../editor/types";
import { loadImageFrameSize, replaceImageWithFitFrame } from "../lib/aiImageLayout";
import type { RightPanelTab } from "./hooks/useAppModals";

export function RightSidebar(props: {
  tab: RightPanelTab;
  onTabChange: (t: RightPanelTab) => void;
  aiChatAttachmentIds: string[];
  onRemoveAiChatAttachment: (id: string) => void;
}) {
  const { tab, onTabChange, aiChatAttachmentIds, onRemoveAiChatAttachment } =
    props;
  const store = useEditorStore();
  const pg = store.getActivePage();
  const selected = pg.elements.find((el) => el.id === store.selectedIds[0]);

  /** 连续拖拽/输入时用 `history: false`，在 blur / mouseup 再 `commitInputGesture()`，避免 undo 一步撤销十次。 */
  function commitInputGesture() {
    useEditorStore.getState().commitHistory();
  }

  function patch(data: Partial<CanvasElement>, history = true) {
    if (!selected) return;
    executeElementCommand({
      type: "updateElement",
      id: selected.id,
      patch: data,
      history,
    });
  }

  return (
    <aside
      className={`right-panel ${tab === "aiGenerate" ? "right-panel--chat" : ""}`}
    >
      <div className="right-tabs">
        <button
          type="button"
          className={tab === "properties" ? "active" : ""}
          onClick={() => onTabChange("properties")}
        >
          属性
        </button>
        <button
          type="button"
          className={tab === "aiGenerate" ? "active" : ""}
          onClick={() => onTabChange("aiGenerate")}
        >
          AI生成
        </button>
        <button
          type="button"
          className={tab === "aiChat" ? "active" : ""}
          onClick={() => onTabChange("aiChat")}
        >
          AI对话
        </button>
      </div>

      {tab === "aiGenerate" && (
        <AiChatPanel
          attachmentIds={aiChatAttachmentIds}
          onRemoveAttachment={onRemoveAiChatAttachment}
        />
      )}

      {tab === "aiChat" && <div className="empty">暂无内容</div>}

      {tab === "properties" && !selected && (
        <div className="empty">请选择元素</div>
      )}

      {tab === "properties" && selected && (
        <>
          <div className="inspect-head">
            <strong>{selected.name}</strong>
            <span>{selected.type}</span>
          </div>

          <div className="layer-actions">
            <button
              type="button"
              onClick={() =>
                executeElementCommand({ type: "bringForward", id: selected.id })
              }
            >
              上移
            </button>
            <button
              type="button"
              onClick={() =>
                executeElementCommand({ type: "sendBackward", id: selected.id })
              }
            >
              下移
            </button>
            <button
              type="button"
              onClick={() =>
                executeElementCommand({ type: "bringToFront", id: selected.id })
              }
            >
              置顶
            </button>
            <button
              type="button"
              onClick={() =>
                executeElementCommand({ type: "sendToBack", id: selected.id })
              }
            >
              置底
            </button>
          </div>

          {store.selectedIds.length > 1 && (
            <section className="panel">
              <h3>多选对齐 / 分布</h3>
              <div className="align-grid">
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({ type: "alignSelected", align: "left" })
                  }
                >
                  左
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({
                      type: "alignSelected",
                      align: "center",
                    })
                  }
                >
                  水平中
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({ type: "alignSelected", align: "right" })
                  }
                >
                  右
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({ type: "alignSelected", align: "top" })
                  }
                >
                  上
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({
                      type: "alignSelected",
                      align: "middle",
                    })
                  }
                >
                  垂直中
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({
                      type: "alignSelected",
                      align: "bottom",
                    })
                  }
                >
                  下
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({
                      type: "distributeSelected",
                      distribute: "horizontal",
                    })
                  }
                >
                  水平分布
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeElementCommand({
                      type: "distributeSelected",
                      distribute: "vertical",
                    })
                  }
                >
                  垂直分布
                </button>
              </div>
            </section>
          )}

          <section className="panel">
            <h3>变换</h3>

            <div className="grid2">
              <Num
                label="X"
                value={selected.x}
                onChange={(v) => patch({ x: v }, false)}
                onCommit={commitInputGesture}
              />
              <Num
                label="Y"
                value={selected.y}
                onChange={(v) => patch({ y: v }, false)}
                onCommit={commitInputGesture}
              />
              <Num
                label="宽"
                value={selected.width}
                onChange={(v) => patch({ width: v }, false)}
                onCommit={commitInputGesture}
              />
              <Num
                label="高"
                value={selected.height}
                onChange={(v) => patch({ height: v }, false)}
                onCommit={commitInputGesture}
              />
            </div>

            <Num
              label="旋转"
              value={selected.rotation}
              onChange={(v) => patch({ rotation: v }, false)}
              onCommit={commitInputGesture}
            />

            <label className="field">
              <span>不透明</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selected.opacity}
                onChange={(e) =>
                  patch({ opacity: Number(e.target.value) }, false)
                }
                onMouseUp={commitInputGesture}
                onTouchEnd={commitInputGesture}
              />
            </label>

            <label className="field">
              <span>锁定</span>
              <input
                type="checkbox"
                checked={selected.locked}
                onChange={(e) => patch({ locked: e.target.checked })}
              />
            </label>
          </section>

          {selected.type === "rect" && (
            <section className="panel">
              <h3>矩形</h3>
              <label className="field">
                <span>填充</span>
                <input
                  type="color"
                  value={selected.fill}
                  onChange={(e) =>
                    patch({ fill: e.target.value } as Partial<CanvasElement>, false)
                  }
                  onBlur={commitInputGesture}
                />
              </label>

              <Num
                label="圆角"
                value={selected.radius}
                onChange={(v) =>
                  patch({ radius: v } as Partial<CanvasElement>, false)
                }
                onCommit={commitInputGesture}
              />
            </section>
          )}

          {selected.type === "text" && (
            <section className="panel">
              <h3>文本</h3>
              <label className="field column">
                <span>内容</span>
                <textarea
                  value={selected.text}
                  onChange={(e) =>
                    patch({ text: e.target.value } as Partial<CanvasElement>, false)
                  }
                  onBlur={commitInputGesture}
                />
              </label>

              <Num
                label="字号"
                value={selected.fontSize}
                onChange={(v) =>
                  patch({ fontSize: v } as Partial<CanvasElement>, false)
                }
                onCommit={commitInputGesture}
              />

              <label className="field">
                <span>颜色</span>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) =>
                    patch({ color: e.target.value } as Partial<CanvasElement>, false)
                  }
                  onBlur={commitInputGesture}
                />
              </label>
            </section>
          )}

          {selected.type === "arrow" && (
            <section className="panel">
              <h3>箭头</h3>
              <label className="field">
                <span>颜色</span>
                <input
                  type="color"
                  value={selected.stroke}
                  onChange={(e) =>
                    patch(
                      { stroke: e.target.value } as Partial<CanvasElement>,
                      false,
                    )
                  }
                  onBlur={commitInputGesture}
                />
              </label>

              <Num
                label="线宽"
                value={selected.strokeWidth}
                onChange={(v) =>
                  patch({ strokeWidth: v } as Partial<CanvasElement>, false)
                }
                onCommit={commitInputGesture}
              />
            </section>
          )}

          {selected.type === "image" && (
            <ImageInspector selected={selected} />
          )}

          {selected.type === "group" && (
            <section className="panel">
              <h3>组合</h3>
              <button
                type="button"
                className="ghost-full-btn"
                onClick={() =>
                  executeElementCommand({ type: "ungroupSelected" })
                }
              >
                取消组合
              </button>
            </section>
          )}
        </>
      )}
    </aside>
  );
}

function ImageInspector(props: { selected: ImageElement }) {
  const store = useEditorStore();
  const selected = props.selected;

  function commitFilterGesture() {
    useEditorStore.getState().commitHistory();
  }

  function patchFilter(
    next: Partial<NonNullable<ImageElement["filter"]>>,
  ) {
    executeElementCommand({
      type: "updateElement",
      id: selected.id,
      patch: {
        filter: { ...selected.filter, ...next },
      } as Partial<CanvasElement>,
      history: false,
    });
  }

  return (
    <section className="panel">
      <h3>滤镜</h3>

      <FilterRange
        label="亮度"
        min={-1}
        max={1}
        step={0.01}
        value={selected.filter?.brightness ?? 0}
        onChange={(v) => patchFilter({ brightness: v })}
        onCommit={commitFilterGesture}
      />

      <FilterRange
        label="对比"
        min={-100}
        max={100}
        step={1}
        value={selected.filter?.contrast ?? 0}
        onChange={(v) => patchFilter({ contrast: v })}
        onCommit={commitFilterGesture}
      />

      <FilterRange
        label="饱和"
        min={-2}
        max={2}
        step={0.01}
        value={selected.filter?.saturation ?? 0}
        onChange={(v) => patchFilter({ saturation: v })}
        onCommit={commitFilterGesture}
      />

      <FilterRange
        label="模糊"
        min={0}
        max={30}
        step={1}
        value={selected.filter?.blur ?? 0}
        onChange={(v) => patchFilter({ blur: v })}
        onCommit={commitFilterGesture}
      />

      <button
        type="button"
        className="ghost-full-btn"
        onClick={() =>
          executeElementCommand({
            type: "updateElement",
            id: selected.id,
            patch: {
              filter: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                blur: 0,
              },
            } as Partial<CanvasElement>,
          })
        }
      >
        重置滤镜
      </button>

      <ReplaceImageButton
        onReplace={(src) => {
          void replaceImageWithFitFrame(
            store.replaceImageFitFrame,
            selected.id,
            src,
          );
        }}
      />

      <button
        type="button"
        className="ghost-full-btn"
        onClick={() => {
          void loadImageFrameSize(selected.src).then((frame) =>
            store.fitImageFrame(selected.id, frame),
          );
        }}
      >
        适应图片比例
      </button>

      <button
        type="button"
        className="ghost-full-btn"
        onClick={() => void exportCroppedImageAsPNG(selected)}
      >
        导出当前裁剪 PNG
      </button>
    </section>
  );
}

function Num(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        type="number"
        value={Number.isFinite(props.value) ? Math.round(props.value) : 0}
        onChange={(e) => props.onChange(Number(e.target.value))}
        onBlur={() => props.onCommit?.()}
      />
    </label>
  );
}

function FilterRange(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        onMouseUp={() => props.onCommit?.()}
        onTouchEnd={() => props.onCommit?.()}
      />
    </label>
  );
}

function ReplaceImageButton(props: { onReplace: (src: string) => void }) {
  return (
    <label className="ghost-full-btn file-label">
      替换图片（适应比例）
      <input
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            props.onReplace(String(reader.result));
          };
          reader.readAsDataURL(file);

          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
