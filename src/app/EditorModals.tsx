import { AiGenerateModal } from "../ai/generation/AiGenerateModal";
import { LibraryPanel } from "../components/LibraryPanel";
import { CropEditorModal } from "../image-tools/crop/CropEditorModal";
import { MaskEditorModal } from "../image-tools/mask/MaskEditorModal";
import { QuickToolbarSettings } from "../components/QuickToolbarSettings";
import { useEditorStore } from "../editor/store";
import { useAppModals } from "./hooks/useAppModals";
import { useProjectImportExport } from "./hooks/useProjectImportExport";

type ModalsState = ReturnType<typeof useAppModals>;
type ProjectIO = ReturnType<typeof useProjectImportExport>;

type EditorModalsProps = {
  modals: ModalsState;
  project: ProjectIO;
};

export function EditorModals(props: EditorModalsProps) {
  const { modals, project } = props;
  const replaceImageKeepFrame = useEditorStore((s) => s.replaceImageKeepFrame);

  return (
    <>
      <input
        ref={project.jsonInputRef}
        hidden
        type="file"
        accept="application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void project.importJSON(file);
          e.currentTarget.value = "";
        }}
      />

      <input
        ref={modals.replaceImageInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = modals.replaceImageTargetId;
          e.currentTarget.value = "";
          if (!file || !id || !file.type.startsWith("image/")) {
            modals.setReplaceImageTargetId(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            replaceImageKeepFrame(id, String(reader.result));
            modals.setReplaceImageTargetId(null);
          };
          reader.onerror = () => modals.setReplaceImageTargetId(null);
          reader.readAsDataURL(file);
        }}
      />

      <LibraryPanel
        open={modals.libraryOpen}
        onClose={() => modals.setLibraryOpen(false)}
      />
      <QuickToolbarSettings
        open={modals.quickToolbarSettingsOpen}
        onClose={() => modals.setQuickToolbarSettingsOpen(false)}
      />

      <AiGenerateModal
        open={modals.aiOpen}
        outputMode={modals.aiOutputMode}
        onClose={() => {
          modals.setAiOpen(false);
          modals.setAiOutputMode("new-layer");
        }}
      />
      <MaskEditorModal
        open={!!modals.maskEditorImageId}
        imageId={modals.maskEditorImageId}
        onClose={() => modals.setMaskEditorImageId(null)}
      />
      <CropEditorModal
        open={!!modals.cropEditorImageId}
        imageId={modals.cropEditorImageId}
        onClose={() => modals.setCropEditorImageId(null)}
      />
    </>
  );
}
