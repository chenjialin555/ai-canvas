import { Layer, Line, Rect } from "react-konva";
import type { Page } from "../../editor/types";
import { PORT_COLORS } from "../../../features/workflow/model/portColors";
import { edgeBezierPointsUnified } from "../../../features/workflow/utils/unifiedGraph";

function Grid(props: { width: number; height: number }) {
  const lines = [];
  const step = 24;

  for (let i = -props.width; i < props.width; i += step) {
    lines.push(
      <Rect
        key={`v-${i}`}
        x={i}
        y={-props.height}
        width={1}
        height={props.height * 2}
        fill={i % 120 === 0 ? "#d2e2e2" : "#dceaea"}
        opacity={i % 120 === 0 ? 0.55 : 0.35}
      />,
    );
  }

  for (let j = -props.height; j < props.height; j += step) {
    lines.push(
      <Rect
        key={`h-${j}`}
        x={-props.width}
        y={j}
        width={props.width * 2}
        height={1}
        fill={j % 120 === 0 ? "#d2e2e2" : "#dceaea"}
        opacity={j % 120 === 0 ? 0.55 : 0.35}
      />,
    );
  }

  return <>{lines}</>;
}

export type BackgroundLayerProps = {
  zoom: number;
  page: Page;
};

export function BackgroundLayer({ zoom, page }: BackgroundLayerProps) {
  return (
    <Layer listening={false}>
      <Grid width={5000} height={3000} />
      {page.edges.map((edge) => {
        const pts = edgeBezierPointsUnified(page, edge);
        const dt = edge.dataType;
        return (
          <Line
            key={edge.id}
            bezier
            points={pts}
            stroke={PORT_COLORS[dt as keyof typeof PORT_COLORS] ?? "#94a3b8"}
            strokeWidth={2 / zoom}
            lineCap="round"
            listening={false}
          />
        );
      })}
    </Layer>
  );
}
