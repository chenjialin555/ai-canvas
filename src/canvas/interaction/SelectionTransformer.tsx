import type { RefObject } from "react";
import { Transformer } from "react-konva";
import Konva from "konva";
import { styleRotaterAnchor } from "../utils/transformerAnchors";

export type SelectionTransformerProps = {
  transformerRef: RefObject<Konva.Transformer | null>;
  selectionHasGroup: boolean;
};

export function SelectionTransformer({
  transformerRef,
  selectionHasGroup,
}: SelectionTransformerProps) {
  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={!selectionHasGroup}
      rotateLineVisible={false}
      rotateAnchorOffset={44}
      rotateAnchorCursor="grab"
      anchorStyleFunc={(anchor) => {
        const n = anchor.name();
        if (n.startsWith("rotater")) {
          const tr = anchor.getParent() as Konva.Transformer;
          if (!tr) return;
          styleRotaterAnchor(anchor, tr);
        }
      }}
      enabledAnchors={[
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ]}
      anchorSize={8}
      anchorCornerRadius={2}
      anchorStroke="#42c4c4"
      anchorFill="#ffffff"
      borderStroke="#42c4c4"
      borderStrokeWidth={1.5}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      boundBoxFunc={(oldBox, newBox) => {
        if (selectionHasGroup) return oldBox;
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      }}
    />
  );
}
