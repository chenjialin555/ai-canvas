import { useRef, useState } from "react";
import type { ContextMenuState } from "../../components/ContextMenu";

export type RightPanelTab = "properties" | "aiGenerate" | "aiChat";

export function useAppModals() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [maskEditorImageId, setMaskEditorImageId] = useState<string | null>(
    null,
  );
  const [cropEditorImageId, setCropEditorImageId] = useState<string | null>(
    null,
  );
  const [quickToolbarSettingsOpen, setQuickToolbarSettingsOpen] =
    useState(false);
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
  const [aiChatAttachmentIds, setAiChatAttachmentIds] = useState<string[]>([]);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
  });

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
    maskEditorImageId,
    setMaskEditorImageId,
    cropEditorImageId,
    setCropEditorImageId,
    quickToolbarSettingsOpen,
    setQuickToolbarSettingsOpen,
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
