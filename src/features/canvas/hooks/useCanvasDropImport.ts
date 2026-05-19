import type { DragEvent, RefObject } from "react";
import { useCallback } from "react";
import Konva from "konva";
import { nanoid } from "nanoid";
import { getImageDefaults, useEditorStore } from "../../editor/store";
import type { CanvasElement } from "../../editor/types";
import { loadImageFrameSize } from "../../../shared/lib/aiImageLayout";
import { screenToWorld } from "../utils/coordinates";

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resolveDropTargetId(
  stage: Konva.Stage,
  clientX: number,
  clientY: number,
): string | null {
  const rect = stage.container().getBoundingClientRect();
  const pointer = {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
  const hit = stage.getIntersection(pointer);
  if (!hit) return null;
  const parent = hit.findAncestor(".editable-node", true);
  return parent?.id() || hit.id() || null;
}

export type UseCanvasDropImportOptions = {
  stageRef: RefObject<Konva.Stage | null>;
};

/**
 * 画布容器拖放图片：命中已有图片则替换，否则在世界坐标新增图层。
 */
export function useCanvasDropImport({ stageRef }: UseCanvasDropImportOptions) {
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;

      const src = await readImageFile(file);
      const stage = stageRef.current;
      if (!stage) return;

      const targetId = resolveDropTargetId(stage, e.clientX, e.clientY);
      const store = useEditorStore.getState();
      const currentPage = store.getActivePage();
      const target = targetId
        ? currentPage.elements.find((el) => el.id === targetId)
        : null;
      const frame = await loadImageFrameSize(src);

      if (target?.type === "image") {
        store.replaceImageFitFrame(target.id, src, frame);
        store.setSelectedIds([target.id]);
        return;
      }

      const rect = stage.container().getBoundingClientRect();
      const pointer = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const world = screenToWorld(pointer, {
        zoom: stage.scaleX(),
        pan: { x: stage.x(), y: stage.y() },
      });

      store.addElement({
        id: nanoid(),
        type: "image",
        name: "拖入图片",
        x: Math.round(world.x),
        y: Math.round(world.y),
        width: frame.width,
        height: frame.height,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        src,
        ...getImageDefaults(),
      } as CanvasElement);
    },
    [stageRef],
  );

  return { onDragOver, onDrop };
}
