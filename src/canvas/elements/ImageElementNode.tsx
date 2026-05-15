import { memo, useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import Konva from "konva";
import type { SceneContext } from "konva/lib/Context";
import type { Filter } from "konva/lib/Node";
import { useEditorStore } from "../../editor/store";
import type { ImageElement, ImageMaskData } from "../../editor/types";
import { exportMaskToDataURL } from "../../image-tools/mask/maskRasterize";
import { commonProps } from "./commonProps";
import { useCanvasImage } from "./useCanvasImage";

function FilteredImage(props: {
  image: HTMLImageElement;
  element: ImageElement;
  finalScale: number;
}) {
  const imageRef = useRef<Konva.Image | null>(null);
  const { image, element, finalScale } = props;

  const filter = element.filter;

  useEffect(() => {
    const node = imageRef.current;
    if (!node) return;

    node.cache();
    node.getLayer()?.batchDraw();

    return () => {
      node.clearCache();
    };
  }, [
    image,
    filter.brightness,
    filter.contrast,
    filter.saturation,
    filter.blur,
    element.cropScale,
    element.cropRotation,
    element.flipX,
    element.flipY,
  ]);

  const filters: Filter[] = [];

  if (filter.brightness !== 0) filters.push(Konva.Filters.Brighten);
  if (filter.contrast !== 0) filters.push(Konva.Filters.Contrast);
  if (filter.saturation !== 0) filters.push(Konva.Filters.HSV);
  if (filter.blur !== 0) filters.push(Konva.Filters.Blur);

  return (
    <KonvaImage
      ref={imageRef}
      image={image}
      x={element.width / 2 + (element.cropOffsetX || 0)}
      y={element.height / 2 + (element.cropOffsetY || 0)}
      offsetX={image.width / 2}
      offsetY={image.height / 2}
      width={image.width}
      height={image.height}
      scaleX={finalScale * (element.flipX ? -1 : 1)}
      scaleY={finalScale * (element.flipY ? -1 : 1)}
      rotation={element.cropRotation || 0}
      listening={false}
      draggable={false}
      filters={filters}
      brightness={filter.brightness}
      contrast={filter.contrast}
      saturation={filter.saturation}
      blurRadius={filter.blur}
    />
  );
}

/** 主画布上叠加显示已保存的 AI 蒙版（与导出 inpaint 用的 raster 一致） */
function AIMaskOverlay(props: {
  mask: ImageMaskData;
  frameW: number;
  frameH: number;
}) {
  const [overlayImg, setOverlayImg] = useState<HTMLImageElement | null>(null);

  const maskKey = `${props.mask.width}x${props.mask.height}-${props.mask.strokes.map((s) => `${s.id}:${s.points.join(",")}`).join("|")}`;

  useEffect(() => {
    if (!props.mask.strokes.length) {
      setOverlayImg(null);
      return;
    }

    const url = exportMaskToDataURL(props.mask);
    if (!url) {
      setOverlayImg(null);
      return;
    }

    const image = new window.Image();
    image.onload = () => setOverlayImg(image);
    image.onerror = () => setOverlayImg(null);
    image.src = url;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [maskKey]);

  if (!overlayImg) return null;

  return (
    <KonvaImage
      image={overlayImg}
      x={0}
      y={0}
      width={props.frameW}
      height={props.frameH}
      opacity={0.55}
      listening={false}
    />
  );
}

export type ImageElementNodeProps = {
  element: ImageElement;
  onOpenCropEditor?: (imageId: string) => void;
};

export const ImageElementNode = memo(function ImageElementNode(
  props: ImageElementNodeProps,
) {
  const image = useCanvasImage(props.element.src);
  const element = props.element;

  const isSelected = useEditorStore((s) => s.selectedIds.includes(element.id));

  const baseScale = image
    ? Math.max(element.width / image.width, element.height / image.height)
    : 1;

  const finalScale = baseScale * (element.cropScale || 1);

  function clipShape(ctx: SceneContext) {
    ctx.beginPath();

    if (element.maskShape === "circle") {
      ctx.ellipse(
        element.width / 2,
        element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      return;
    }

    const radius =
      element.maskShape === "roundRect" ? element.cornerRadius || 0 : 0;

    if (radius <= 0) {
      ctx.rect(0, 0, element.width, element.height);
      return;
    }

    const r = Math.min(radius, element.width / 2, element.height / 2);
    ctx.moveTo(r, 0);
    ctx.lineTo(element.width - r, 0);
    ctx.quadraticCurveTo(element.width, 0, element.width, r);
    ctx.lineTo(element.width, element.height - r);
    ctx.quadraticCurveTo(
      element.width,
      element.height,
      element.width - r,
      element.height,
    );
    ctx.lineTo(r, element.height);
    ctx.quadraticCurveTo(0, element.height, 0, element.height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
  }

  return (
    <Group
      {...commonProps(element)}
      draggable={!element.locked}
      onClick={(e) => {
        e.cancelBubble = true;
        const state = useEditorStore.getState();
        if (state.editingTextId) return;
        if (e.evt.shiftKey) {
          if (state.selectedIds.includes(element.id)) {
            state.setSelectedIds(
              state.selectedIds.filter((id) => id !== element.id),
            );
          } else {
            state.setSelectedIds([...state.selectedIds, element.id]);
          }
        } else {
          state.setSelectedIds([element.id]);
        }
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        useEditorStore.getState().setSelectedIds([element.id]);
        props.onOpenCropEditor?.(element.id);
      }}
    >
      <Group clipFunc={clipShape} listening={false}>
        <Rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          fill="#e5e7eb"
          cornerRadius={
            element.maskShape === "roundRect" ? element.cornerRadius || 0 : 0
          }
          listening={false}
        />

        {image && (
          <FilteredImage
            image={image}
            element={element}
            finalScale={finalScale}
          />
        )}

        {element.aiMask && element.aiMask.strokes.length > 0 && (
          <AIMaskOverlay
            mask={element.aiMask}
            frameW={element.width}
            frameH={element.height}
          />
        )}

        <Rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          fill="transparent"
          listening={false}
        />

        {element.aiMask && (
          <Group x={8} y={8} listening={false}>
            <Rect
              width={78}
              height={24}
              fill="rgba(255,23,23,0.88)"
              cornerRadius={6}
            />
            <Text
              x={8}
              y={5}
              text="AI 蒙版"
              fontSize={12}
              fill="#ffffff"
            />
          </Group>
        )}

        {isSelected && (
          <Rect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            stroke="#42c4c4"
            strokeWidth={1}
            cornerRadius={
              element.maskShape === "roundRect" ? element.cornerRadius || 0 : 0
            }
            listening={false}
          />
        )}
      </Group>

      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        fill="transparent"
        listening
      />
    </Group>
  );
});
