import { useCallback, type RefObject } from "react";
import Konva from "konva";
import { downloadDataURL } from "../../editor/export";

export function useStageExport(
  stageRef: RefObject<Konva.Stage | null>,
) {
  const exportStage = useCallback(
    (type: "png" | "jpg") => {
      const stage = stageRef.current;
      if (!stage) return;

      const dataURL = stage.toDataURL({
        pixelRatio: 2,
        mimeType: type === "png" ? "image/png" : "image/jpeg",
        quality: 0.95,
      });

      downloadDataURL(dataURL, `ai-canvas.${type}`);
    },
    [stageRef],
  );

  return { exportStage };
}
