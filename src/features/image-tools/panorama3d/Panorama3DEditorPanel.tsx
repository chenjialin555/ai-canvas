import { useEffect, useMemo, useRef, useState } from "react";
import { useCanvasImage } from "../../canvas/elements/useCanvasImage";
import { useEditorStore } from "../../editor/store";
import type { ImageElement } from "../../editor/types";
import {
  createPannellumViewer,
  type PannellumViewerInstance,
} from "../../lib/pannellumViewer";

function panoramaRatioHint(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 2) > 0.15) {
    return `当前尺寸：${width}×${height}，不是标准 2:1，可能会变形`;
  }
  return `当前尺寸：${width}×${height}，适合全景预览`;
}

type Props = {
  imageId: string;
  active: boolean;
  onClose: () => void;
};

export function Panorama3DEditorPanel({ imageId, active, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<PannellumViewerInstance | null>(null);

  const { getActivePage } = useEditorStore();
  const page = getActivePage();

  const sourceEl = useMemo(() => {
    return page.elements.find((el) => el.id === imageId && el.type === "image") as
      | ImageElement
      | undefined;
  }, [page.elements, imageId]);

  const imgLoaded = useCanvasImage(active ? sourceEl?.src : undefined);
  const [imageInfo, setImageInfo] = useState("");

  const editorH = Math.min(window.innerHeight - 180, 780);
  const panoramaSrc = sourceEl?.src ?? null;

  useEffect(() => {
    if (!active || !sourceEl) {
      setImageInfo("");
      return;
    }
    setImageInfo("正在加载图片…");
  }, [active, imageId, sourceEl]);

  useEffect(() => {
    if (!active || !imgLoaded) return;
    setImageInfo(panoramaRatioHint(imgLoaded.width, imgLoaded.height));
  }, [active, imgLoaded]);

  useEffect(() => {
    if (!active || !panoramaSrc || !containerRef.current) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    viewerRef.current = createPannellumViewer(containerRef.current, {
      type: "equirectangular",
      panorama: panoramaSrc,
      autoLoad: true,
      showZoomCtrl: true,
    });

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [active, panoramaSrc]);

  if (!sourceEl) return null;

  return (
    <>
      <div className="image-editor-subbar">
        <span className="image-editor-subbar-hint">
          拖动查看 · 滚轮缩放 · 建议 2:1 等距柱状投影全景图
        </span>
        <div className="image-editor-subbar-actions">
          <button type="button" className="primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>

      <div className="mask-body image-editor-panel-row">
        <div
          className="mask-canvas-wrap panorama3d-viewer-wrap"
          style={{ minHeight: editorH }}
        >
          <div
            ref={containerRef}
            className="panorama3d-viewer"
            style={{ width: "100%", height: editorH }}
          />
        </div>

        <div className="mask-panel">
          <h3>全景预览</h3>

          <p className="panorama3d-hint">
            {imageInfo || "使用当前画布图片节点进行预览"}
          </p>

          <label className="mask-field">
            <span>节点尺寸</span>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
              {Math.round(sourceEl.width)} × {Math.round(sourceEl.height)} px
              {imgLoaded
                ? ` · 原图 ${imgLoaded.width} × ${imgLoaded.height} px`
                : ""}
            </div>
          </label>

          <label className="mask-field">
            <span>说明</span>
            <div
              style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}
            >
              预览当前图片节点的等距柱状投影（Equirectangular）全景，仅用于查看，不会修改画布上的图片。
            </div>
          </label>
        </div>
      </div>
    </>
  );
}
