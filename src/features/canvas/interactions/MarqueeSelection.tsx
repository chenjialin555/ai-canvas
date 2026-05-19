import { Rect } from "react-konva";

export type MarqueeBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MarqueeSelectionProps = {
  visible: boolean;
  box: MarqueeBox;
};

export function MarqueeSelection({ visible, box }: MarqueeSelectionProps) {
  if (!visible) return null;

  return (
    <Rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      fill="rgba(66,196,196,0.14)"
      stroke="#2f7cff"
      strokeWidth={1}
      listening={false}
    />
  );
}
