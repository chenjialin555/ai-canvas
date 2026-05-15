import { memo } from "react";
import { useEditorStore } from "../../editor/store";
import { ArrowElementNode } from "./ArrowElementNode";
import { GroupElementNode } from "./GroupElementNode";
import { ImageElementNode } from "./ImageElementNode";
import { RectElementNode } from "./RectElementNode";
import { TextElementNode } from "./TextElementNode";

export type ElementNodeProps = {
  elementId: string;
  onOpenCropEditor?: (imageId: string) => void;
};

/** 按 id 订阅单个元素，父级 pan/zoom 变化不会触发本节点重渲染 */
export const ElementNode = memo(function ElementNode(props: ElementNodeProps) {
  const element = useEditorStore((s) => {
    const page = s.pages.find((p) => p.id === s.activePageId);
    return page?.elements.find((el) => el.id === props.elementId);
  });

  if (!element || !element.visible) return null;

  if (element.type === "image") {
    return (
      <ImageElementNode
        element={element}
        onOpenCropEditor={props.onOpenCropEditor}
      />
    );
  }
  if (element.type === "rect") {
    return <RectElementNode element={element} />;
  }
  if (element.type === "text") {
    return <TextElementNode element={element} />;
  }
  if (element.type === "arrow") {
    return <ArrowElementNode element={element} />;
  }
  if (element.type === "group") {
    return <GroupElementNode element={element} />;
  }

  return null;
});
