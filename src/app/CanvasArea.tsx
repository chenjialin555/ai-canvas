import type Konva from "konva";
import type { RefObject } from "react";
import { FloatingToolbar } from "../components/FloatingToolbar";
import { MiniMap } from "../components/MiniMap";
import { StageCanvas } from "../components/StageCanvas";
import { PageTabs } from "./PageTabs";

type CanvasAreaProps = {
  stageRef: RefObject<Konva.Stage | null>;
  onOpenCropEditor: (id: string) => void;
  onContextMenu: (params: {
    x: number;
    y: number;
    targetId: string | null;
  }) => void;
  onFloatingCrop: (id: string) => void;
  onFloatingMask: (id: string) => void;
  onFloatingOpenAI: (args: {
    imageId: string;
    mode: "new-layer" | "replace-selected";
  }) => void;
  onFloatingConnect: () => void;
  onFloatingReplaceImage: (imageId: string) => void;
  onFloatingOpenLibrary: () => void;
};

export function CanvasArea(props: CanvasAreaProps) {
  return (
    <section className="canvas-area">
      <PageTabs />

      <StageCanvas
        stageRefExternal={props.stageRef}
        onOpenCropEditor={props.onOpenCropEditor}
        onContextMenu={props.onContextMenu}
      />

      <MiniMap />

      <FloatingToolbar
        stageRef={props.stageRef}
        onCrop={props.onFloatingCrop}
        onMask={props.onFloatingMask}
        onOpenAI={props.onFloatingOpenAI}
        onConnect={props.onFloatingConnect}
        onReplaceImage={props.onFloatingReplaceImage}
        onOpenLibrary={props.onFloatingOpenLibrary}
      />
    </section>
  );
}
