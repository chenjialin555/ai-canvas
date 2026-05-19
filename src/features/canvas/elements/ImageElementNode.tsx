import { memo, useEffect, useState } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { SceneContext } from "konva/lib/Context";
import { useEditorStore } from "../../editor/store";
import { normalizeImageFilter } from "../../editor/image-filter/imageFilter";
import { imageFilterRevision } from "../../editor/image-filter/filterRevision";
import { useFilteredImageSource } from "./useFilteredImageSource";
import type { ImageElement, ImageMaskData } from "../../editor/types";
import { exportMaskToDataURL } from "../../../features/image-tools/mask/maskRasterize";
import { commonProps } from "./commonProps";
import { ImageLoadingOverlay } from "./ImageLoadingOverlay";
import { useCanvasImage } from "./useCanvasImage";

function VignetteOverlay(props: {
  width: number;
  height: number;
  strength: number;
}) {
  if (!props.strength) return null;
  const opacity = Math.min(0.75, (Math.abs(props.strength) / 100) * 0.65);
  const r = Math.max(props.width, props.height) * 0.72;

  return (
    <Rect
      x={0}
      y={0}
      width={props.width}
      height={props.height}
      listening={false}
      fillRadialGradientStartPoint={{ x: props.width / 2, y: props.height / 2 }}
      fillRadialGradientEndPoint={{ x: props.width / 2, y: props.height / 2 }}
      fillRadialGradientStartRadius={0}
      fillRadialGradientEndRadius={r}
      fillRadialGradientColorStops={[0, "rgba(0,0,0,0)", 1, `rgba(0,0,0,${opacity})`]}
    />
  );
}

function FilteredImage(props: {
  image: HTMLImageElement;
  element: ImageElement;
  filterRevision: string;
  finalScale: number;
}) {
  const { image, element, filterRevision, finalScale } = props;
  const filter = normalizeImageFilter(element.filter);

  const displayImage =
    useFilteredImageSource(image, filterRevision, filter) ?? image;
  const iw =
    (displayImage instanceof HTMLCanvasElement
      ? displayImage.width
      : displayImage.naturalWidth) || displayImage.width;
  const ih =
    (displayImage instanceof HTMLCanvasElement
      ? displayImage.height
      : displayImage.naturalHeight) || displayImage.height;

  return (
    <>
      <KonvaImage
        key={filterRevision}
        image={displayImage}
        x={element.width / 2 + (element.cropOffsetX || 0)}
        y={element.height / 2 + (element.cropOffsetY || 0)}
        offsetX={iw / 2}
        offsetY={ih / 2}
        width={iw}
        height={ih}
        scaleX={finalScale * (element.flipX ? -1 : 1)}
        scaleY={finalScale * (element.flipY ? -1 : 1)}
        rotation={element.cropRotation || 0}
        listening={false}
        draggable={false}
      />
      <VignetteOverlay
        width={element.width}
        height={element.height}
        strength={filter.vignette}
      />
    </>
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
  const { image, loading: imageLoading } = useCanvasImage(props.element.src);
  const element = props.element;

  const filterRevision = imageFilterRevision(
    normalizeImageFilter(element.filter),
  );
  const placeholderRadius =
    element.maskShape === "roundRect" ? element.cornerRadius || 0 : 0;

  const isSelected = useEditorStore((s) => s.selectedIds.includes(element.id));

  /** contain：完整显示原图，外框比例由导入时按原图计算 */
  const baseScale = image
    ? Math.min(element.width / image.width, element.height / image.height)
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
        e.evt.stopPropagation();
        const group = e.currentTarget as Konva.Group;
        group.stopDrag();
        const latest = useEditorStore
          .getState()
          .getActivePage()
          .elements.find((el) => el.id === element.id);
        if (latest) {
          group.position({ x: latest.x, y: latest.y });
        }
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

        {imageLoading && (
          <ImageLoadingOverlay
            width={element.width}
            height={element.height}
            cornerRadius={placeholderRadius}
          />
        )}

        {image && (
          <FilteredImage
            image={image}
            element={element}
            filterRevision={filterRevision}
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
            stroke="#2f7cff"
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
