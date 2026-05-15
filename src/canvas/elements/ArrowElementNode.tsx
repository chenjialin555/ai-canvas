import { Arrow } from "react-konva";
import type { CanvasElement } from "../../editor/types";
import type { GuideLine } from "../types";
import { commonProps } from "./commonProps";

export type ArrowElementNodeProps = {
  element: Extract<CanvasElement, { type: "arrow" }>;
  setGuides: (g: GuideLine[]) => void;
};

export function ArrowElementNode(props: ArrowElementNodeProps) {
  const el = props.element;

  return (
    <Arrow
      {...commonProps(el, props.setGuides)}
      points={[0, el.height / 2, el.width, el.height / 2]}
      stroke={el.stroke}
      fill={el.stroke}
      strokeWidth={el.strokeWidth}
      pointerLength={18}
      pointerWidth={18}
    />
  );
}
