import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Layer, Group, Circle } from "react-konva";
import { useEditorStore } from "../../editor/store";
import type { Store } from "../../editor/store";
import { EMPTY_STRING_ARRAY } from "../../editor/store/shallowEqual";
import type { ImageElement } from "../../editor/types";
import { imageOutputPortOffset } from "../../workflow/nodeLayout";
import { PORT_COLORS } from "../../workflow/portColors";
import { ElementNode } from "../elements/ElementNode";
import { WorkflowNodeView } from "../../components/workflow/WorkflowNodeView";

function selectRootElementIds(s: Store) {
  const page = s.pages.find((p) => p.id === s.activePageId);
  if (!page) return EMPTY_STRING_ARRAY;
  return page.elements.filter((el) => !el.parentId).map((el) => el.id);
}

function selectImagePortIds(s: Store) {
  const page = s.pages.find((p) => p.id === s.activePageId);
  if (!page) return EMPTY_STRING_ARRAY;
  return page.elements
    .filter(
      (e): e is ImageElement =>
        e.type === "image" && e.visible && !e.parentId,
    )
    .map((e) => e.id);
}

function selectAiNodeIds(s: Store) {
  const page = s.pages.find((p) => p.id === s.activePageId);
  if (!page) return EMPTY_STRING_ARRAY;
  return page.aiNodes.map((n) => n.id);
}

/** 画布元素与 AI 节点层：不订阅 zoom/pan */
export const CanvasPageContent = memo(function CanvasPageContent(props: {
  onOpenCropEditor?: (imageId: string) => void;
}) {
  const rootElementIds = useEditorStore(
    useShallow(selectRootElementIds),
  );
  const imagePortIds = useEditorStore(useShallow(selectImagePortIds));
  const aiNodeIds = useEditorStore(useShallow(selectAiNodeIds));

  return (
    <Layer>
      {rootElementIds.map((id) => (
        <ElementNode
          key={id}
          elementId={id}
          onOpenCropEditor={props.onOpenCropEditor}
        />
      ))}
      <ImageWorkflowPortsOverlay imageIds={imagePortIds} />
      {aiNodeIds.map((id) => (
        <WorkflowNodeView key={id} nodeId={id} />
      ))}
    </Layer>
  );
});

const ImageWorkflowPortsOverlay = memo(function ImageWorkflowPortsOverlay(props: {
  imageIds: string[];
}) {
  const startWfConn = useEditorStore((s) => s.startWorkflowConnecting);

  return (
    <>
      {props.imageIds.map((elementId) => (
        <ImagePortGroup
          key={`img-wf-port-${elementId}`}
          elementId={elementId}
          startWfConn={startWfConn}
        />
      ))}
    </>
  );
});

function ImagePortGroup(props: {
  elementId: string;
  startWfConn: Store["startWorkflowConnecting"];
}) {
  const element = useEditorStore((s) => {
    const page = s.pages.find((p) => p.id === s.activePageId);
    const el = page?.elements.find((e) => e.id === props.elementId);
    return el?.type === "image" ? el : null;
  });

  if (!element) return null;

  return (
    <Group
      x={element.x}
      y={element.y}
      rotation={element.rotation}
    >
      {(["image", "mask"] as const).map((pid) => {
        const o = imageOutputPortOffset(pid, element.width, element.height);
        const disabled = pid === "mask" && !element.aiMask;
        const col =
          pid === "image"
            ? PORT_COLORS.image
            : disabled
              ? "#cbd5e1"
              : PORT_COLORS.mask;
        return (
          <Circle
            key={pid}
            x={o.x}
            y={o.y}
            radius={disabled ? 5 : 8}
            fill={col}
            stroke="#fff"
            strokeWidth={2}
            opacity={disabled ? 0.45 : 1}
            listening={!element.locked && !disabled}
            onMouseDown={(e) => {
              if (disabled || element.locked) return;
              e.cancelBubble = true;
              const stage = e.target.getStage();
              if (!stage) return;
              const pos = stage.getRelativePointerPosition();
              if (!pos) return;
              props.startWfConn(
                {
                  kind: "image-element",
                  elementId: element.id,
                  portId: pid,
                },
                pos.x,
                pos.y,
              );
            }}
          />
        );
      })}
    </Group>
  );
}
