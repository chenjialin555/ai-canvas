import { useCallback, useRef, useState } from "react";
import type { ContextMenuState } from "../../shared/ui/ContextMenu";
import type { ImageEditorTool } from "../../features/image-tools/types";

export type RightPanelTab = "properties" | "aiGenerate" | "aiChat";

export type ImageEditorState = {
  imageId: string;
  tool: ImageEditorTool;
} | null;

export function useAppModals() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [imageEditor, setImageEditor] = useState<ImageEditorState>(null);
  const [quickToolbarSettingsOpen, setQuickToolbarSettingsOpen] =
    useState(false);
  const [appearanceSettingsOpen, setAppearanceSettingsOpen] = useState(false);
  const [aiOutputMode, setAiOutputMode] = useState<
    "new-layer" | "replace-selected"
  >("new-layer");
  const [toolbarToast, setToolbarToast] = useState<string | null>(null);
  const toolbarToastTimerRef = useRef<number | null>(null);
  const [replaceImageTargetId, setReplaceImageTargetId] = useState<
    string | null
  >(null);
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);

  const [rightTab, setRightTab] = useState<RightPanelTab>("properties");
  const [aiChatAttachmentIds, setAiChatAttachmentIds] = useState<string[]>(
    [],
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
    targetKind: "empty",
  });

  const openImageEditor = useCallback(
    (imageId: string, tool: ImageEditorTool) => {
      setImageEditor({ imageId, tool });
    },
    [],
  );

  const closeImageEditor = useCallback(() => {
    setImageEditor(null);
  }, []);

  function addToAiChat(id: string) {
    setAiChatAttachmentIds((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
    setRightTab("aiGenerate");
  }

  function removeAiChatAttachment(id: string) {
    setAiChatAttachmentIds((prev) => prev.filter((x) => x !== id));
  }

  return {
    libraryOpen,
    setLibraryOpen,
    aiOpen,
    setAiOpen,
    imageEditor,
    setImageEditor,
    openImageEditor,
    closeImageEditor,
    quickToolbarSettingsOpen,
    setQuickToolbarSettingsOpen,
    appearanceSettingsOpen,
    setAppearanceSettingsOpen,
    aiOutputMode,
    setAiOutputMode,
    toolbarToast,
    setToolbarToast,
    toolbarToastTimerRef,
    replaceImageTargetId,
    setReplaceImageTargetId,
    replaceImageInputRef,
    rightTab,
    setRightTab,
    aiChatAttachmentIds,
    addToAiChat,
    removeAiChatAttachment,
    contextMenu,
    setContextMenu,
  };
}
