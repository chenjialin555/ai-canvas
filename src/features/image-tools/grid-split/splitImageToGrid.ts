import { nanoid } from "nanoid";
import { canvasToDataUrl } from "../../editor/export/canvasEncode";
import { renderImageElementToCanvas } from "../../editor/export/renderImageElement";
import { getImageDefaults } from "../../editor/store/helpers/imageDefaults";
import type { ImageElement } from "../../editor/types";

export type GridSplitSpec = {
  rows: number;
  cols: number;
};

const MAX_GRID = 10;
const MIN_GRID = 1;
const OUTPUT_GAP = 12;

export function clampGridDimension(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(MIN_GRID, Math.min(MAX_GRID, Math.floor(n)));
}

/** 将画布上可见图片切成 rows×cols 张，返回待插入的新图片元素（不含历史提交） */
export async function buildGridSplitElements(
  source: ImageElement,
  spec: GridSplitSpec,
): Promise<ImageElement[]> {
  const rows = clampGridDimension(spec.rows);
  const cols = clampGridDimension(spec.cols);

  const rendered = await renderImageElementToCanvas(source);
  if (!rendered) {
    throw new Error("无法渲染当前图片，请检查图片是否可加载");
  }

  const { canvas } = rendered;
  const cellPixelW = Math.floor(canvas.width / cols);
  const cellPixelH = Math.floor(canvas.height / rows);
  if (cellPixelW < 1 || cellPixelH < 1) {
    throw new Error("宫格过密，无法切分");
  }

  const tileW = source.width / cols;
  const tileH = source.height / rows;
  const gridOriginX = source.x + source.width + 24;
  const gridOriginY = source.y;

  const out: ImageElement[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * cellPixelW;
      const sy = r * cellPixelH;
      const sw = c === cols - 1 ? canvas.width - sx : cellPixelW;
      const sh = r === rows - 1 ? canvas.height - sy : cellPixelH;

      const cellCanvas = document.createElement("canvas");
      cellCanvas.width = sw;
      cellCanvas.height = sh;
      const ctx = cellCanvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      const dataUrl = await canvasToDataUrl(cellCanvas, "image/png");

      const pieceIndex = r * cols + c + 1;
      out.push({
        id: nanoid(),
        type: "image",
        name: `${source.name} · ${pieceIndex}`,
        x: gridOriginX + c * (tileW + OUTPUT_GAP),
        y: gridOriginY + r * (tileH + OUTPUT_GAP),
        width: tileW,
        height: tileH,
        rotation: 0,
        opacity: source.opacity,
        visible: true,
        locked: false,
        src: dataUrl,
        ...getImageDefaults(),
      });
    }
  }

  return out;
}

export const GRID_SPLIT_PRESETS: {
  label: string;
  rows: number;
  cols: number;
  cells: number;
}[] = [
  { label: "4宫格（2×2）", rows: 2, cols: 2, cells: 4 },
  { label: "9宫格（3×3）", rows: 3, cols: 3, cells: 9 },
  { label: "16宫格（4×4）", rows: 4, cols: 4, cells: 16 },
  { label: "25宫格（5×5）", rows: 5, cols: 5, cells: 25 },
];
