import { nanoid } from "nanoid";
import { getImageDefaults, useEditorStore } from "../editor/store";
import type { CanvasElement } from "../editor/types";
import { loadImageFrameSize } from "../lib/aiImageLayout";

const assets = [
  {
    name: "室内图 01",
    src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
  },
  {
    name: "室内图 02",
    src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200",
  },
  {
    name: "UI 截图",
    src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200",
  },
  {
    name: "工作台",
    src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LibraryPanel(props: Props) {
  const { addElement } = useEditorStore();

  if (!props.open) return null;

  async function addAsset(src: string, name: string) {
    const frame = await loadImageFrameSize(src);
    addElement({
      id: nanoid(),
      type: "image",
      name,
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

  function addTemplate() {
    const items: CanvasElement[] = [
      {
        id: nanoid(),
        type: "rect",
        name: "模板背景",
        x: 300,
        y: 260,
        width: 720,
        height: 420,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: "#e8fbfb",
        radius: 18,
      },
      {
        id: nanoid(),
        type: "text",
        name: "模板标题",
        x: 350,
        y: 320,
        width: 600,
        height: 80,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        text: "AI Canvas 模板标题",
        fontSize: 42,
        fontFamily: "Microsoft YaHei",
        fontWeight: "700",
        color: "#111827",
        align: "left",
      },
    ];

    for (const item of items) {
      addElement(item);
    }
  }

  return (
    <div className="library-panel">
      <div className="library-head">
        <strong>模板 / 素材库</strong>
        <button type="button" onClick={props.onClose}>
          ×
        </button>
      </div>

      <button type="button" className="template-btn" onClick={addTemplate}>
        插入基础模板
      </button>

      <div className="asset-grid">
        {assets.map((item) => (
          <button
            key={item.src}
            type="button"
            className="asset-card"
            onClick={() => addAsset(item.src, item.name)}
          >
            <img src={item.src} alt="" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
