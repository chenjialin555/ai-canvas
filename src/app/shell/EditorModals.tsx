import { AiGenerateModal } from "../ai/generation/AiGenerateModal";
import { LibraryPanel } from "../components/LibraryPanel";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { QuickToolbarSettings } from "../components/QuickToolbarSettings";
import { ImageEditorModal } from "../image-tools/ImageEditorModal";
import { useEditorStore } from "../editor/store";
import { replaceImageWithFitFrame } from "../lib/aiImageLayout";
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
  const replaceImageFitFrame = useEditorStore((s) => s.replaceImageFitFrame);

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
            void replaceImageWithFitFrame(
              replaceImageFitFrame,
              id,
              String(reader.result),
            ).finally(() => modals.setReplaceImageTargetId(null));
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
      <AppearanceSettings
        open={modals.appearanceSettingsOpen}
        onClose={() => modals.setAppearanceSettingsOpen(false)}
      />

      <AiGenerateModal
        open={modals.aiOpen}
        outputMode={modals.aiOutputMode}
        onClose={() => {
          modals.setAiOpen(false);
          modals.setAiOutputMode("new-layer");
        }}
      />

      <ImageEditorModal
        open={!!modals.imageEditor}
        imageId={modals.imageEditor?.imageId ?? null}
        tool={modals.imageEditor?.tool ?? "crop"}
        onToolChange={(tool) =>
          modals.setImageEditor((prev) =>
            prev ? { ...prev, tool } : null,
          )
        }
        onClose={modals.closeImageEditor}
      />
    </>
  );
}
