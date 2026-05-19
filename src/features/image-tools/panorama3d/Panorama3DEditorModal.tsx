import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useCanvasImage } from "../../canvas/elements/useCanvasImage";
import { useEditorStore } from "../../editor/store";
import type { ImageElement } from "../../editor/types";
import {
  createPannellumViewer,
  type PannellumViewerInstance,
} from "../../../shared/lib/pannellumViewer";

function panoramaRatioHint(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 2) > 0.15) {
    return `当前尺寸：${width}×${height}，不是标准 2:1，可能会变形`;
  }
  return `当前尺寸：${width}×${height}，适合全景预览`;
}

type Props = {
  imageId: string | null;
  open: boolean;
  onClose: () => void;
};

export function Panorama3DEditorModal({ imageId, open, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<PannellumViewerInstance | null>(null);
  const uploadBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { getActivePage } = useEditorStore();
  const page = getActivePage();

  const sourceEl = useMemo(() => {
    return page.elements.find((el) => el.id === imageId && el.type === "image") as
      | ImageElement
      | undefined;
  }, [page.elements, imageId]);

  const { image: imgLoaded } = useCanvasImage(open ? sourceEl?.src : undefined);
  const [panoramaSrc, setPanoramaSrc] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState("");

  const editorH = Math.min(window.innerHeight - 120, 820);

  const revokeUploadBlob = useCallback(() => {
    if (uploadBlobUrlRef.current) {
      URL.revokeObjectURL(uploadBlobUrlRef.current);
      uploadBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open || !sourceEl) {
      setPanoramaSrc(null);
      setImageInfo("");
      return;
    }

    setPanoramaSrc(sourceEl.src);
    setImageInfo("正在加载图片…");
  }, [open, imageId, sourceEl]);

  useEffect(() => {
    if (!open || !imgLoaded) return;
    setImageInfo(panoramaRatioHint(imgLoaded.width, imgLoaded.height));
  }, [open, imgLoaded]);

  useEffect(() => {
    if (!open || !panoramaSrc || !containerRef.current) return;

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
  }, [open, panoramaSrc]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) revokeUploadBlob();
  }, [open, revokeUploadBlob]);

  useEffect(() => revokeUploadBlob, [revokeUploadBlob]);

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageInfo("请上传图片文件");
      return;
    }

    revokeUploadBlob();
    const objectUrl = URL.createObjectURL(file);
    uploadBlobUrlRef.current = objectUrl;

    const img = new Image();
    img.onload = () => {
      setImageInfo(panoramaRatioHint(img.width, img.height));
      setPanoramaSrc(objectUrl);
    };
    img.onerror = () => {
      setImageInfo("图片加载失败");
      revokeUploadBlob();
    };
    img.src = objectUrl;
  }

  function resetToSource() {
    if (!sourceEl) return;
    revokeUploadBlob();
    setPanoramaSrc(sourceEl.src);
    if (imgLoaded) {
      setImageInfo(panoramaRatioHint(imgLoaded.width, imgLoaded.height));
    }
  }

  if (!open || !sourceEl) return null;

  return (
    <div className="mask-modal">
      <div className="mask-editor">
        <div className="mask-topbar">
          <strong>3D 全景解析</strong>
          <span className="mask-divider" />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            拖动查看 · 滚轮缩放 · 建议 2:1 等距柱状投影全景图
          </span>
          <button type="button" className="save" onClick={onClose}>
            ✓ 完成
          </button>
          <button type="button" className="cancel" onClick={onClose}>
            × 取消
          </button>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="mask-body">
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
              {imageInfo || "建议上传 2:1 全景图"}
            </p>

            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/*"
              onChange={handleUpload}
            />

            <div className="crop-toolbar">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                上传全景图
              </button>
              <button type="button" onClick={resetToSource}>
                恢复原图
              </button>
            </div>

            <label className="mask-field">
              <span>节点尺寸</span>
              <div
                style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}
              >
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
                本工具用于预览等距柱状投影（Equirectangular）全景图。预览仅用于查看，不会修改画布上的图片。
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
