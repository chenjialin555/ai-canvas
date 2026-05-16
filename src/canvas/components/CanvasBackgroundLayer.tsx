import { memo } from "react";
import { Layer, Line } from "react-konva";
import { useEditorStore } from "../../editor/store";
import { PORT_COLORS } from "../../workflow/portColors";
import { edgeBezierPointsUnified } from "../../workflow/utils/unifiedGraph";

const GRID_STEP = 24;
const GRID_W = 5000;
const GRID_H = 3000;

/** 静态网格，不随 zoom 重绘 */
const StaticGrid = memo(function StaticGrid() {
  const lines = [];
  for (let i = -GRID_W; i < GRID_W; i += GRID_STEP) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i, -GRID_H, i, GRID_H]}
        stroke={i % 120 === 0 ? "#c8dce8" : "#d8e8ee"}
        strokeWidth={1}
        opacity={i % 120 === 0 ? 0.4 : 0.22}
        listening={false}
        perfectDrawEnabled={false}
      />,
    );
  }
  for (let j = -GRID_H; j < GRID_H; j += GRID_STEP) {
    lines.push(
      <Line
        key={`h-${j}`}
        points={[-GRID_W, j, GRID_W, j]}
        stroke={j % 120 === 0 ? "#c8dce8" : "#d8e8ee"}
        strokeWidth={1}
        opacity={j % 120 === 0 ? 0.4 : 0.22}
        listening={false}
        perfectDrawEnabled={false}
      />,
    );
  }
  return <>{lines}</>;
});

/** 仅订阅 edges，不订阅 zoom/pan */
export const CanvasBackgroundLayer = memo(function CanvasBackgroundLayer() {
  const page = useEditorStore((s) =>
    s.pages.find((p) => p.id === s.activePageId),
  );
  if (!page) return null;

  return (
    <Layer listening={false}>
      <StaticGrid />
      {page.edges.map((edge) => {
        const pts = edgeBezierPointsUnified(page, edge);
        const dt = edge.dataType;
        return (
          <Line
            key={edge.id}
            bezier
            points={pts}
            stroke={PORT_COLORS[dt as keyof typeof PORT_COLORS] ?? "#94a3b8"}
            strokeWidth={2}
            strokeScaleEnabled={false}
            lineCap="round"
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </Layer>
  );
});
