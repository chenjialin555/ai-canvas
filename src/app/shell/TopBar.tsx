import { nanoid } from "nanoid";
import { downloadJSON } from "../editor/export";
import { getImageDefaults, useEditorStore } from "../editor/store";
import type { CanvasElement } from "../editor/types";
import { loadImageFrameSize } from "../lib/aiImageLayout";

type TopBarProps = {
  onOpenLibrary: () => void;
  onOpenAi: () => void;
  onOpenQuickToolbarSettings: () => void;
  onOpenSettings: () => void;
  onPickJson: () => void;
  exportStage: (type: "png" | "jpg") => void;
};

export function TopBar(props: TopBarProps) {
  const store = useEditorStore();

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
      fill: "#2f7cff",
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

  async function addImage() {
    const src =
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400";
    const frame = await loadImageFrameSize(src);
    store.addElement({
      id: nanoid(),
      type: "image",
      name: "图片",
      x: 420,
      y: 320,
      width: frame.width,
      height: frame.height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      src,
      ...getImageDefaults(),
    } as CanvasElement);
  }

  return (
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
        <button type="button" onClick={props.onOpenLibrary}>
          素材库
        </button>
        <button type="button" onClick={props.onOpenAi}>
          AI 生图
        </button>
        <button type="button" onClick={props.onOpenQuickToolbarSettings}>
          快捷工具条
        </button>
        <button type="button" onClick={props.onOpenSettings}>
          设置
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
        <button type="button" onClick={props.onPickJson}>
          加载JSON
        </button>
        <button type="button" onClick={() => props.exportStage("png")}>
          导出PNG
        </button>
        <button type="button" onClick={() => props.exportStage("jpg")}>
          导出JPG
        </button>
      </div>
    </header>
  );
}
