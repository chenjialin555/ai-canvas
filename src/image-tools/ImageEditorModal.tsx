import { useEffect } from "react";
import { CropEditorPanel } from "./crop/CropEditorPanel";
import { MaskEditorPanel } from "./mask/MaskEditorPanel";
import { Panorama3DEditorPanel } from "./panorama3d/Panorama3DEditorPanel";
import { IMAGE_EDITOR_TABS, type ImageEditorTool } from "./types";

type Props = {
  open: boolean;
  imageId: string | null;
  tool: ImageEditorTool;
  onToolChange: (tool: ImageEditorTool) => void;
  onClose: () => void;
};

export function ImageEditorModal(props: Props) {
  const { open, imageId, tool, onToolChange, onClose } = props;

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

  if (!open || !imageId) return null;

  return (
    <div
      className="modal-mask image-editor-mask"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="image-editor"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="image-editor-head">
          <strong className="image-editor-title">图片编辑</strong>

          <nav className="image-editor-tabs" aria-label="图片工具">
            {IMAGE_EDITOR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tool === tab.id ? "active" : ""}
                onClick={() => onToolChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="image-editor-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </header>

        <div className="image-editor-body">
          {tool === "crop" && (
            <CropEditorPanel
              imageId={imageId}
              active
              onClose={onClose}
            />
          )}
          {tool === "mask" && (
            <MaskEditorPanel
              imageId={imageId}
              active
              onClose={onClose}
            />
          )}
          {tool === "parse3d" && (
            <Panorama3DEditorPanel
              imageId={imageId}
              active
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
