import { AiChatPanel } from "../components/AiChatPanel";
import { exportCroppedImageAsPNG } from "../editor/export";
import { useEditorStore } from "../editor/store";
import type { CanvasElement, ImageElement } from "../editor/types";
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

  function patch(data: Partial<CanvasElement>) {
    if (!selected) return;
    store.updateElement(selected.id, data);
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
              onClick={() => store.bringForward(selected.id)}
            >
              上移
            </button>
            <button
              type="button"
              onClick={() => store.sendBackward(selected.id)}
            >
              下移
            </button>
            <button
              type="button"
              onClick={() => store.bringToFront(selected.id)}
            >
              置顶
            </button>
            <button type="button" onClick={() => store.sendToBack(selected.id)}>
              置底
            </button>
          </div>

          {store.selectedIds.length > 1 && (
            <section className="panel">
              <h3>多选对齐 / 分布</h3>
              <div className="align-grid">
                <button
                  type="button"
                  onClick={() => store.alignSelected("left")}
                >
                  左
                </button>
                <button
                  type="button"
                  onClick={() => store.alignSelected("center")}
                >
                  水平中
                </button>
                <button
                  type="button"
                  onClick={() => store.alignSelected("right")}
                >
                  右
                </button>
                <button
                  type="button"
                  onClick={() => store.alignSelected("top")}
                >
                  上
                </button>
                <button
                  type="button"
                  onClick={() => store.alignSelected("middle")}
                >
                  垂直中
                </button>
                <button
                  type="button"
                  onClick={() => store.alignSelected("bottom")}
                >
                  下
                </button>
                <button
                  type="button"
                  onClick={() => store.distributeSelected("horizontal")}
                >
                  水平分布
                </button>
                <button
                  type="button"
                  onClick={() => store.distributeSelected("vertical")}
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
                onChange={(v) => patch({ x: v })}
              />
              <Num
                label="Y"
                value={selected.y}
                onChange={(v) => patch({ y: v })}
              />
              <Num
                label="宽"
                value={selected.width}
                onChange={(v) => patch({ width: v })}
              />
              <Num
                label="高"
                value={selected.height}
                onChange={(v) => patch({ height: v })}
              />
            </div>

            <Num
              label="旋转"
              value={selected.rotation}
              onChange={(v) => patch({ rotation: v })}
            />

            <label className="field">
              <span>不透明</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selected.opacity}
                onChange={(e) => patch({ opacity: Number(e.target.value) })}
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
                    store.updateElement(selected.id, {
                      fill: e.target.value,
                    } as Partial<CanvasElement>)
                  }
                />
              </label>

              <Num
                label="圆角"
                value={selected.radius}
                onChange={(v) =>
                  store.updateElement(selected.id, {
                    radius: v,
                  } as Partial<CanvasElement>)
                }
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
                    store.updateElement(selected.id, {
                      text: e.target.value,
                    } as Partial<CanvasElement>)
                  }
                />
              </label>

              <Num
                label="字号"
                value={selected.fontSize}
                onChange={(v) =>
                  store.updateElement(selected.id, {
                    fontSize: v,
                  } as Partial<CanvasElement>)
                }
              />

              <label className="field">
                <span>颜色</span>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) =>
                    store.updateElement(selected.id, {
                      color: e.target.value,
                    } as Partial<CanvasElement>)
                  }
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
                    store.updateElement(selected.id, {
                      stroke: e.target.value,
                    } as Partial<CanvasElement>)
                  }
                />
              </label>

              <Num
                label="线宽"
                value={selected.strokeWidth}
                onChange={(v) =>
                  store.updateElement(selected.id, {
                    strokeWidth: v,
                  } as Partial<CanvasElement>)
                }
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
                onClick={() => store.ungroupSelected()}
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

  return (
    <section className="panel">
      <h3>滤镜</h3>

      <FilterRange
        label="亮度"
        min={-1}
        max={1}
        step={0.01}
        value={selected.filter?.brightness ?? 0}
        onChange={(v) =>
          store.updateElement(selected.id, {
            filter: {
              ...selected.filter,
              brightness: v,
            },
          } as Partial<CanvasElement>)
        }
      />

      <FilterRange
        label="对比"
        min={-100}
        max={100}
        step={1}
        value={selected.filter?.contrast ?? 0}
        onChange={(v) =>
          store.updateElement(selected.id, {
            filter: {
              ...selected.filter,
              contrast: v,
            },
          } as Partial<CanvasElement>)
        }
      />

      <FilterRange
        label="饱和"
        min={-2}
        max={2}
        step={0.01}
        value={selected.filter?.saturation ?? 0}
        onChange={(v) =>
          store.updateElement(selected.id, {
            filter: {
              ...selected.filter,
              saturation: v,
            },
          } as Partial<CanvasElement>)
        }
      />

      <FilterRange
        label="模糊"
        min={0}
        max={30}
        step={1}
        value={selected.filter?.blur ?? 0}
        onChange={(v) =>
          store.updateElement(selected.id, {
            filter: {
              ...selected.filter,
              blur: v,
            },
          } as Partial<CanvasElement>)
        }
      />

      <button
        type="button"
        className="ghost-full-btn"
        onClick={() =>
          store.updateElement(selected.id, {
            filter: {
              brightness: 0,
              contrast: 0,
              saturation: 0,
              blur: 0,
            },
          } as Partial<CanvasElement>)
        }
      >
        重置滤镜
      </button>

      <ReplaceImageButton
        onReplace={(src) => store.replaceImageKeepFrame(selected.id, src)}
      />

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
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        type="number"
        value={Number.isFinite(props.value) ? Math.round(props.value) : 0}
        onChange={(e) => props.onChange(Number(e.target.value))}
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
      />
    </label>
  );
}

function ReplaceImageButton(props: { onReplace: (src: string) => void }) {
  return (
    <label className="ghost-full-btn file-label">
      替换图片，保持裁剪框
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
