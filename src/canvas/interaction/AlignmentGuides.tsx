import { Line } from "react-konva";
import type { GuideLine } from "../types";

export type AlignmentGuidesProps = {
  guides: GuideLine[];
};

export function AlignmentGuides({ guides }: AlignmentGuidesProps) {
  return (
    <>
      {guides.map((guide, index) => (
        <Line
          key={`${guide.type}-${guide.position}-${index}`}
          points={
            guide.type === "vertical"
              ? [guide.position, -5000, guide.position, 5000]
              : [-5000, guide.position, 5000, guide.position]
          }
          stroke="#42c4c4"
          strokeWidth={1}
          dash={[6, 4]}
          listening={false}
        />
      ))}
    </>
  );
}
