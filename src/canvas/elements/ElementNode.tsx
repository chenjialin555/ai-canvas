import type { CanvasElement } from "../../editor/types";
import type { GuideLine } from "../types";
import { ArrowElementNode } from "./ArrowElementNode";
import { GroupElementNode } from "./GroupElementNode";
import { ImageElementNode } from "./ImageElementNode";
import { RectElementNode } from "./RectElementNode";
import { TextElementNode } from "./TextElementNode";

export type ElementNodeProps = {
  element: CanvasElement;
  setGuides: (g: GuideLine[]) => void;
  onOpenCropEditor?: (imageId: string) => void;
};

export function ElementNode(props: ElementNodeProps) {
  const { element } = props;

  if (!element.visible) return null;

  if (element.type === "image") {
    return (
      <ImageElementNode
        element={element}
        setGuides={props.setGuides}
        onOpenCropEditor={props.onOpenCropEditor}
      />
    );
  }
  if (element.type === "rect") {
    return <RectElementNode element={element} setGuides={props.setGuides} />;
  }
  if (element.type === "text") {
    return <TextElementNode element={element} setGuides={props.setGuides} />;
  }
  if (element.type === "arrow") {
    return <ArrowElementNode element={element} setGuides={props.setGuides} />;
  }
  if (element.type === "group") {
    return <GroupElementNode element={element} setGuides={props.setGuides} />;
  }

  return null;
}
