import { useCallback, type RefObject } from "react";
import Konva from "konva";
import {
  computeMaxImageExportPixelRatio,
  downloadDataURL,
  useEditorStore,
} from "@/features/editor";
import type { ImageElement } from "@/features/editor/types";
import { randomImageFilename } from "../../shared/lib/randomFilename";

export function useStageExport(
  stageRef: RefObject<Konva.Stage | null>,
) {
  const exportStage = useCallback(
    (type: "png" | "jpg") => {
      void (async () => {
        const stage = stageRef.current;
        if (!stage) return;

        const page = useEditorStore.getState().getActivePage();
        const images = page.elements.filter(
          (el): el is ImageElement => el.type === "image",
        );
        const pixelRatio = await computeMaxImageExportPixelRatio(images);

        const dataURL = stage.toDataURL({
          pixelRatio,
          mimeType: type === "png" ? "image/png" : "image/jpeg",
          quality: 0.95,
        });

        downloadDataURL(dataURL, randomImageFilename(type));
      })();
    },
    [stageRef],
  );

  return { exportStage };
}
