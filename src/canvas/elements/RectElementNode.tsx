import { Rect } from "react-konva";
import type { CanvasElement } from "../../editor/types";
import type { GuideLine } from "../types";
import { commonProps } from "./commonProps";

export type RectElementNodeProps = {
  element: Extract<CanvasElement, { type: "rect" }>;
  setGuides: (g: GuideLine[]) => void;
};

export function RectElementNode(props: RectElementNodeProps) {
  const el = props.element;

  return (
    <Rect
      {...commonProps(el, props.setGuides)}
      fill={el.fill}
      cornerRadius={el.radius}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth || 0}
    />
  );
}
