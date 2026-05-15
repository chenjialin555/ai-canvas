import { useEffect, useState } from "react";
import { Line } from "react-konva";
import {
  getGuidesSnapshot,
  subscribeGuides,
} from "../guides/guidesRuntime";
import type { GuideLine } from "../types";

export function AlignmentGuides() {
  const [guides, setGuides] = useState<GuideLine[]>(() => getGuidesSnapshot());

  useEffect(() => {
    return subscribeGuides(() => {
      setGuides(getGuidesSnapshot());
    });
  }, []);

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
          perfectDrawEnabled={false}
        />
      ))}
    </>
  );
}
