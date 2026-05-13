import { useRef, useState } from "react";
import Konva from "konva";
import { nanoid } from "nanoid";
import { StageCanvas } from "./components/StageCanvas";
import { ContextMenu, type ContextMenuState } from "./components/ContextMenu";
import { MiniMap } from "./components/MiniMap";
import { LibraryPanel } from "./components/LibraryPanel";
import { AiGenerateModal } from "./components/AiGenerateModal";
import { AiChatPanel } from "./components/AiChatPanel";
import { MaskEditorModal } from "./components/MaskEditorModal";
import { CropEditorModal } from "./components/CropEditorModal";
import {
  downloadDataURL,
  downloadJSON,
  exportCroppedImageAsPNG,
  readJSONFile,
} from "./editor/export";
import { getImageDefaults, useEditorStore } from "./editor/store";
import type { CanvasElement, ImageElement } from "./editor/types";

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [maskEditorImageId, setMaskEditorImageId] = useState<string | null>(
    null,
  );
  const [cropEditorImageId, setCropEditorImageId] = useState<string | null>(
    null,
  );

  const [rightTab, setRightTab] = useState<"properties" | "aiChat">(
    "properties",
  );
  const [aiChatAttachmentIds, setAiChatAttachmentIds] = useState<string[]>([]);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
  });

  const store = useEditorStore();
  const page = store.getActivePage();
  const selected = page.elements.find((el) => el.id === store.selectedIds[0]);

  function addRect() {
    store.addElement({
      id: nanoid(),
      type: "rect",
      name: "矩形",
      x: 300,
      y: 220,
      width: 260,
      height: 160,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#42c4c4",
      radius: 0,
    });
  }

  function addText() {
    store.addElement({
      id: nanoid(),
      type: "text",
      name: "文字",
      x: 320,
      y: 260,
      width: 420,
      height: 90,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      text: "双击编辑文字",
      fontSize: 38,
      fontFamily: "Microsoft YaHei",
      fontWeight: "700",
      color: "#111827",
      align: "left",
    });
  }

  function addArrow() {
    store.addElement({
      id: nanoid(),
      type: "arrow",
      name: "箭头",
      x: 400,
      y: 360,
      width: 360,
      height: 80,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      stroke: "#cf6c6c",
      strokeWidth: 5,
    });
  }

  function addImage() {
    store.addElement({
      id: nanoid(),
      type: "image",
      name: "图片",
      x: 420,
      y: 320,
      width: 520,
      height: 320,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400",
      ...getImageDefaults(),
    } as CanvasElement);
  }

  async function importJSON(file: File) {
    try {
      const data = await readJSONFile(file);
      store.loadProjectJSON(data);
    } catch {
      alert("JSON 文件格式错误");
    }
  }

  function addToAiChat(id: string) {
    setAiChatAttachmentIds((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
    setRightTab("aiChat");
  }

  function removeAiChatAttachment(id: string) {
    setAiChatAttachmentIds((prev) => prev.filter((x) => x !== id));
  }

  function exportStage(type: "png" | "jpg") {
    const stage = stageRef.current;
    if (!stage) return;

    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: type === "png" ? "image/png" : "image/jpeg",
      quality: 0.95,
    });

    downloadDataURL(dataURL, `ai-canvas.${type}`);
  }

  return (
    <div
      className="figma-app"
      onMouseDown={() => {
        if (contextMenu.visible) {
          setContextMenu((m) => ({ ...m, visible: false }));
        }
      }}
    >
      <input
        ref={jsonInputRef}
        hidden
        type="file"
        accept="application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importJSON(file);
          e.currentTarget.value = "";
        }}
      />

      <header className="figma-topbar">
        <div className="brand">
          <strong>AI Canvas</strong>
          <span>| 无限画布</span>
        </div>

        <div className="toolbar">
          <button
            type="button"
            className={store.tool === "select" ? "active" : ""}
            onClick={() => store.setTool("select")}
          >
            指针
          </button>
          <button type="button" onClick={addRect}>
            矩形
          </button>
          <button type="button" onClick={addText}>
            文字
          </button>
          <button type="button" onClick={addArrow}>
            箭头
          </button>
          <button type="button" onClick={addImage}>
            图片
          </button>
          <button type="button" onClick={() => setLibraryOpen(true)}>
            素材库
          </button>
          <button type="button" onClick={() => setAiOpen(true)}>
            AI 生图
          </button>

          <span className="sep" />

          <button type="button" onClick={() => store.undo()}>
            撤销
          </button>
          <button type="button" onClick={() => store.redo()}>
            重做
          </button>

          <span className="sep" />

          <button type="button" onClick={() => store.groupSelected()}>
            组合
          </button>
          <button type="button" onClick={() => store.ungroupSelected()}>
            取消组合
          </button>

          <span className="sep" />

          <button
            type="button"
            onClick={() => store.removeSelected()}
            disabled={!store.selectedIds.length}
          >
            删除
          </button>

          <span className="zoom">{Math.round(store.zoom * 100)}%</span>
        </div>

        <div className="top-actions">
          <button
            type="button"
            onClick={() => downloadJSON(store.exportProjectJSON())}
          >
            保存JSON
          </button>
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
          >
            加载JSON
          </button>
          <button type="button" onClick={() => exportStage("png")}>
            导出PNG
          </button>
          <button type="button" onClick={() => exportStage("jpg")}>
            导出JPG
          </button>
        </div>
      </header>

      <main className="figma-main">
        <LeftPanel />

        <section className="canvas-area">
          <PageTabs />

          <StageCanvas
            stageRefExternal={stageRef}
            onOpenCropEditor={(id) => setCropEditorImageId(id)}
            onContextMenu={(params) => {
              if (
                params.targetId &&
                !store.selectedIds.includes(params.targetId)
              ) {
                store.setSelectedIds([params.targetId]);
              }

              setContextMenu({
                visible: true,
                x: params.x,
                y: params.y,
                targetId: params.targetId,
              });
            }}
          />

          <MiniMap />
        </section>

        <RightPanel
          tab={rightTab}
          onTabChange={setRightTab}
          aiChatAttachmentIds={aiChatAttachmentIds}
          onRemoveAiChatAttachment={removeAiChatAttachment}
        />
      </main>

      <ContextMenu
        menu={contextMenu}
        selected={selected}
        onClose={() => setContextMenu((m) => ({ ...m, visible: false }))}
        onCopy={() => {
          store.copy();
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onPaste={() => {
          store.paste();
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onDelete={() => {
          store.removeSelected();
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onBringToFront={() => {
          if (selected) store.bringToFront(selected.id);
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onSendToBack={() => {
          if (selected) store.sendToBack(selected.id);
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onGroup={() => {
          store.groupSelected();
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onUngroup={() => {
          store.ungroupSelected();
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onLock={() => {
          if (selected) {
            store.updateElement(selected.id, {
              locked: !selected.locked,
            } as Partial<CanvasElement>);
          }
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onHide={() => {
          if (selected) {
            store.updateElement(selected.id, {
              visible: false,
            } as Partial<CanvasElement>);
          }
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onCrop={() => {
          if (selected?.type === "image") {
            setCropEditorImageId(selected.id);
          }
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onOpenAI={() => {
          setAiOpen(true);
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onEditMask={() => {
          if (selected?.type === "image") {
            setMaskEditorImageId(selected.id);
          }
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onClearMask={() => {
          if (selected?.type === "image" && selected.aiMask) {
            store.clearImageAIMask(selected.id);
          }
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
        onAddToAiChat={() => {
          const id = contextMenu.targetId ?? selected?.id;
          if (id) addToAiChat(id);
          setContextMenu((m) => ({ ...m, visible: false }));
        }}
      />

      <LibraryPanel open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      <AiGenerateModal open={aiOpen} onClose={() => setAiOpen(false)} />
      <MaskEditorModal
        open={!!maskEditorImageId}
        imageId={maskEditorImageId}
        onClose={() => setMaskEditorImageId(null)}
      />
      <CropEditorModal
        open={!!cropEditorImageId}
        imageId={cropEditorImageId}
        onClose={() => setCropEditorImageId(null)}
      />
    </div>
  );
}

function PageTabs() {
  const {
    pages,
    activePageId,
    setActivePageId,
    addPage,
    duplicatePage,
    removePage,
    renamePage,
  } = useEditorStore();

  return (
    <div className="tabs">
      {pages.map((p) => (
        <button
          key={p.id}
          type="button"
          className={p.id === activePageId ? "active" : ""}
          onClick={() => setActivePageId(p.id)}
          onDoubleClick={() => {
            const name = prompt("页面名称", p.name);
            if (name) renamePage(p.id, name);
          }}
        >
          {p.name}
        </button>
      ))}

      <button type="button" onClick={() => addPage()}>
        +
      </button>

      {pages.length > 1 && (
        <button type="button" onClick={() => removePage(activePageId)}>
          删页
        </button>
      )}

      <button type="button" onClick={() => duplicatePage(activePageId)}>
        复制页
      </button>
    </div>
  );
}

function LeftPanel() {
  const { getActivePage, selectedIds, setSelectedIds, updateElement } =
    useEditorStore();

  const page = getActivePage();
  const elements = [...page.elements].filter((el) => !el.parentId).reverse();

  return (
    <aside className="left-panel">
      <div className="project-head">
        <strong>项目管理</strong>
      </div>

      <div className="outline-head">
        <span>大纲</span>
      </div>

      <input className="search" placeholder="搜索元素..." />

      <div className="layers">
        {elements.map((el) => (
          <div
            key={el.id}
            className={`layer-row ${
              selectedIds.includes(el.id) ? "selected" : ""
            }`}
            onClick={(e) => {
              if (e.shiftKey) {
                if (selectedIds.includes(el.id)) {
                  setSelectedIds(selectedIds.filter((id) => id !== el.id));
                } else {
                  setSelectedIds([...selectedIds, el.id]);
                }
              } else {
                setSelectedIds([el.id]);
              }
            }}
          >
            <span>{icon(el.type)}</span>
            <span className="layer-name">{el.name}</span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateElement(el.id, {
                  locked: !el.locked,
                } as Partial<CanvasElement>);
              }}
            >
              {el.locked ? "锁" : "开"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateElement(el.id, {
                  visible: !el.visible,
                } as Partial<CanvasElement>);
              }}
            >
              {el.visible ? "显" : "隐"}
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

type RightPanelTab = "properties" | "aiChat";

function RightPanel(props: {
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
      className={`right-panel ${tab === "aiChat" ? "right-panel--chat" : ""}`}
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
          className={tab === "aiChat" ? "active" : ""}
          onClick={() => onTabChange("aiChat")}
        >
          AI对话
        </button>
      </div>

      {tab === "aiChat" && (
        <AiChatPanel
          attachmentIds={aiChatAttachmentIds}
          onRemoveAttachment={onRemoveAiChatAttachment}
        />
      )}

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
        <button type="button" onClick={() => store.bringForward(selected.id)}>
          上移
        </button>
        <button type="button" onClick={() => store.sendBackward(selected.id)}>
          下移
        </button>
        <button type="button" onClick={() => store.bringToFront(selected.id)}>
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
            <button type="button" onClick={() => store.alignSelected("left")}>
              左
            </button>
            <button type="button" onClick={() => store.alignSelected("center")}>
              水平中
            </button>
            <button type="button" onClick={() => store.alignSelected("right")}>
              右
            </button>
            <button type="button" onClick={() => store.alignSelected("top")}>
              上
            </button>
            <button type="button" onClick={() => store.alignSelected("middle")}>
              垂直中
            </button>
            <button type="button" onClick={() => store.alignSelected("bottom")}>
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
          <Num label="X" value={selected.x} onChange={(v) => patch({ x: v })} />
          <Num label="Y" value={selected.y} onChange={(v) => patch({ y: v })} />
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

function icon(type: string) {
  if (type === "image") return "🖼";
  if (type === "rect") return "□";
  if (type === "text") return "T";
  if (type === "arrow") return "↗";
  if (type === "group") return "▦";
  return "·";
}
