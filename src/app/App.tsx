/**
 * 应用根组件（入口见 main.tsx → ./app/App）。
 *
 * 职责划分：
 * - 布局骨架：AppShell（顶栏 / 左栏 / 画布 / 右栏 / 浮层）
 * - 全局编辑状态：Zustand useEditorStore（页面、选中、元素、工作流等）
 * - 纯 UI 状态：useAppModals（弹窗开关、右键菜单位置、侧栏 Tab 等，不写进 store）
 * - 工程导入导出、整页导出：各自 hook
 *
 * 本文件主要是「把子组件拼起来 + 把画布/工具条/右键菜单的回调接到 store 或弹窗」，
 * 具体画布交互在 StageCanvas，具体弹窗内容在 EditorModals。
 */
import { useRef } from "react";
import Konva from "konva";
import { ContextMenu } from "../components/ContextMenu";
import { exportCroppedImageAsPNG } from "../editor/export";
import { useEditorStore } from "../editor/store";
import type { CanvasElement } from "../editor/types";
import { AppShell } from "./AppShell";
import { CanvasArea } from "./CanvasArea";
import { EditorModals } from "./EditorModals";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { TopBar } from "./TopBar";
import { useAppModals } from "./hooks/useAppModals";
import { useProjectImportExport } from "./hooks/useProjectImportExport";
import { useStageExport } from "./hooks/useStageExport";

export default function App() {
  // Konva Stage 实例引用，供顶栏「导出整页 PNG」等需要直接读画布的场景使用
  const stageRef = useRef<Konva.Stage | null>(null);

  // 各类 Modal / 右键菜单 / 侧栏 Tab 等 UI 状态（见 hooks/useAppModals.ts）
  const modals = useAppModals();
  // JSON 导入导出：隐藏 file input + 读写 ProjectJSON
  const project = useProjectImportExport();
  const { exportStage } = useStageExport(stageRef);

  const store = useEditorStore();
  const page = store.getActivePage();
  // 当前「主选中」元素（多选时 ContextMenu 等仍按第一个 id 处理）
  const selected = page.elements.find((el) => el.id === store.selectedIds[0]);

  /** 右键菜单操作后统一关闭菜单（避免每个 onXxx 重复写 setContextMenu） */
  const closeContextMenu = () =>
    modals.setContextMenu((m) => ({ ...m, visible: false }));

  /** 浮动工具条「连接 AI 节点」：在画布世界坐标打开节点挑选器，并短暂提示 */
  const openWorkflowPickerWithToast = (
    worldX: number,
    worldY: number,
    message: string,
    durationMs: number,
  ) => {
    store.openWorkflowNodePickerAtWorld(worldX, worldY);
    if (modals.toolbarToastTimerRef.current) {
      window.clearTimeout(modals.toolbarToastTimerRef.current);
    }
    modals.setToolbarToast(message);
    modals.toolbarToastTimerRef.current = window.setTimeout(() => {
      modals.setToolbarToast(null);
      modals.toolbarToastTimerRef.current = null;
    }, durationMs);
  };

  return (
    <AppShell
      // 点击应用任意空白处时收起右键菜单
      onRootMouseDown={() => {
        if (modals.contextMenu.visible) {
          modals.setContextMenu((m) => ({ ...m, visible: false }));
        }
      }}
      topBar={
        <TopBar
          onOpenLibrary={() => modals.setLibraryOpen(true)}
          onOpenAi={() => modals.setAiOpen(true)}
          onOpenQuickToolbarSettings={() =>
            modals.setQuickToolbarSettingsOpen(true)
          }
          onPickJson={() => project.jsonInputRef.current?.click()}
          exportStage={exportStage}
        />
      }
      leftSidebar={
        // 图层列表、页面 Tab 等（内部自己订阅 store）
        <LeftSidebar />
      }
      canvasArea={
        <CanvasArea
          stageRef={stageRef}
          // --- 来自 StageCanvas / FloatingToolbar 的回调：打开各类编辑器 ---
          onOpenCropEditor={(id) => modals.setCropEditorImageId(id)}
          onContextMenu={(params) => {
            // 右键目标若未在选中集内，先选中再弹菜单（x/y 为屏幕 client 坐标）
            if (
              params.targetId &&
              !store.selectedIds.includes(params.targetId)
            ) {
              store.setSelectedIds([params.targetId]);
            }

            modals.setContextMenu({
              visible: true,
              x: params.x,
              y: params.y,
              targetId: params.targetId,
            });
          }}
          onFloatingCrop={(id) => modals.setCropEditorImageId(id)}
          onFloatingMask={(id) => modals.setMaskEditorImageId(id)}
          onFloatingOpenAI={({ imageId, mode }) => {
            store.setSelectedIds([imageId]);
            modals.setAiOutputMode(mode);
            modals.setAiOpen(true);
          }}
          onFloatingConnect={() => {
            if (selected?.type === "image") {
              // 有选中图：在图片右侧附近弹出节点挑选器
              openWorkflowPickerWithToast(
                selected.x + selected.width + 80,
                selected.y + 40,
                "选择要添加的 AI 节点（图片已带输出端口，也可从右侧圆点拖线）",
                2600,
              );
            } else {
              // 无选中图：默认位置 + 提示用户先选图或拖端口连线
              openWorkflowPickerWithToast(
                420,
                280,
                "在画布上选择图片，或从图片右侧端口拖线连接 AI 节点",
                2800,
              );
            }
          }}
          onFloatingReplaceImage={(imageId) => {
            modals.setReplaceImageTargetId(imageId);
            modals.replaceImageInputRef.current?.click();
          }}
          onFloatingOpenLibrary={() => modals.setLibraryOpen(true)}
        />
      }
      rightSidebar={
        <RightSidebar
          tab={modals.rightTab}
          onTabChange={modals.setRightTab}
          aiChatAttachmentIds={modals.aiChatAttachmentIds}
          onRemoveAiChatAttachment={modals.removeAiChatAttachment}
        />
      }
      overlays={
        <>
          {/* 画布右键菜单：编辑类操作走 store，打开弹窗走 modals */}
          <ContextMenu
            menu={modals.contextMenu}
            selected={selected}
            onClose={closeContextMenu}
            onCopy={() => {
              store.copy();
              closeContextMenu();
            }}
            onPaste={() => {
              store.paste();
              closeContextMenu();
            }}
            onExportPng={() => {
              if (selected?.type === "image") {
                void exportCroppedImageAsPNG(selected);
              }
              closeContextMenu();
            }}
            onDelete={() => {
              store.removeSelected();
              closeContextMenu();
            }}
            onBringToFront={() => {
              if (selected) store.bringToFront(selected.id);
              closeContextMenu();
            }}
            onSendToBack={() => {
              if (selected) store.sendToBack(selected.id);
              closeContextMenu();
            }}
            onGroup={() => {
              store.groupSelected();
              closeContextMenu();
            }}
            onUngroup={() => {
              store.ungroupSelected();
              closeContextMenu();
            }}
            onLock={() => {
              if (selected) {
                store.updateElement(selected.id, {
                  locked: !selected.locked,
                } as Partial<CanvasElement>);
              }
              closeContextMenu();
            }}
            onHide={() => {
              if (selected) {
                store.updateElement(selected.id, {
                  visible: false,
                } as Partial<CanvasElement>);
              }
              closeContextMenu();
            }}
            onCrop={() => {
              if (selected?.type === "image") {
                modals.setCropEditorImageId(selected.id);
              }
              closeContextMenu();
            }}
            onOpenAI={() => {
              modals.setAiOutputMode("new-layer");
              modals.setAiOpen(true);
              closeContextMenu();
            }}
            onEditMask={() => {
              if (selected?.type === "image") {
                modals.setMaskEditorImageId(selected.id);
              }
              closeContextMenu();
            }}
            onClearMask={() => {
              if (selected?.type === "image" && selected.aiMask) {
                store.clearImageAIMask(selected.id);
              }
              closeContextMenu();
            }}
            onAddToAiChat={() => {
              // 优先用右键点中的 targetId，否则用当前主选中
              const id = modals.contextMenu.targetId ?? selected?.id;
              if (id) modals.addToAiChat(id);
              closeContextMenu();
            }}
          />

          {/* 素材库、AI 生图、裁剪/蒙版、隐藏 file input 等，统一挂在这里 */}
          <EditorModals modals={modals} project={project} />

          {modals.toolbarToast && (
            <div className="toolbar-toast" role="status">
              {modals.toolbarToast}
            </div>
          )}
        </>
      }
    />
  );
}
