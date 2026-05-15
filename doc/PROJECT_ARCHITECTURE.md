# AI Canvas 项目架构学习文档

> 面向：**React + Konva + Zustand + FastAPI** 全栈维护者。  
> 目标：系统理解定位、数据流、坐标、**画布 AI 节点工作流**与单步生图链路，并能安全扩展。

**相关短文档**：给 AI / 快速交接用 [`docs/AI_CONTEXT.md`](../docs/AI_CONTEXT.md)；个人学习与维护 [`docs/MAINTENANCE_GUIDE.md`](../docs/MAINTENANCE_GUIDE.md)；阶段勾选简表 [`docs/ROADMAP.md`](../docs/ROADMAP.md)。

---

## 目录

1. [项目定位](#1-项目定位)
2. [技术栈](#2-技术栈)
3. [仓库目录结构](#3-仓库目录结构)
4. [核心数据模型](#4-核心数据模型)
5. [Zustand 状态管理](#5-zustand-状态管理)
6. [React 组件职责](#6-react-组件职责)
7. [画布坐标系统](#7-画布坐标系统)
8. [图片裁剪](#8-图片裁剪)
9. [AI 蒙版](#9-ai-蒙版)
10. [AI 生图调用流程](#10-ai-生图调用流程)
11. [Python 后端](#11-python-后端)
12. [OSS 上传](#12-oss-上传)
13. [保存与加载 JSON / localStorage](#13-保存与加载-json--localstorage)
14. [典型用户操作数据流](#14-典型用户操作数据流)
15. [容易混淆的问题](#15-容易混淆的问题)
16. [如何扩展](#16-如何扩展)
17. [画布 AI 节点工作流（当前实现）](#17-画布-ai-节点工作流当前实现)
18. [前端源码文件全表](#18-前端源码文件全表)
19. [后端 Python 源码文件全表](#19-后端-python-源码文件全表)
20. [根目录脚本与配置](#20-根目录脚本与配置)

---

## 1. 项目定位

| 维度 | 说明 |
|------|------|
| **产品形态** | 浏览器内的 **可视化画布编辑器**（类 Figma 的简化版）：多页面、图层、选择/变换、对齐、组合、小地图、素材库。 |
| **差异化能力** | ① **单步 AI 弹窗**：生图 / 图生图 / 局部重绘（inpaint），`ImageElement` + 笔刷蒙版 → FastAPI → OSS → 多模型网关。② **同一画布上的 AI 节点图**：`Page.aiNodes` + `Page.edges`，端口连线、逐节点运行（`POST /api/workflow/run-node`）或纯前端同步类节点。 |
| **数据真相源** | 前端 **Zustand + Immer** 持有的 `pages[]`（每页含 `elements`、`aiNodes`、`edges`）；持久化以 **localStorage**（防抖 + 配额保护）为主，另支持 **导出/导入 `ProjectJSON`** 与 **远程 save/load**（自备契约）。 |
| **运行时** | `npm run dev` 通过 **concurrently** 同时起 **Vite（5173）** 与 **uvicorn（默认 13555）**；Vite 将 `/api` **代理**到后端，避免 CORS 与端口混用问题。 |

```mermaid
flowchart LR
  subgraph browser["浏览器"]
    React["React UI"]
    Konva["Konva Stage"]
    Zustand["Zustand Store"]
    React --> Konva
    React --> Zustand
    Konva --> Zustand
  end
  subgraph server["本机/服务器"]
    FastAPI["FastAPI"]
    OSS["阿里云 OSS"]
    GW["Comfly / Dashscope 等网关"]
    WF["workflow executors"]
  end
  browser -->|"/api/* 代理"| FastAPI
  FastAPI --> OSS
  FastAPI --> GW
  FastAPI --> WF
```

---

## 2. 技术栈

### 2.1 前端

| 技术 | 版本（参考 `package.json`） | 用途 |
|------|---------------------------|------|
| React | 19.x | UI 与状态订阅 |
| TypeScript | ~5.6 | 类型安全 |
| Vite | 6.x | 开发与构建；`/api` 代理 |
| Konva / react-konva | 9.x / 19.x | 2D 画布、变换器、滤镜、裁剪预览、**工作流节点 Konva 视图** |
| Zustand | 5.x | 全局编辑器状态 |
| Immer (`produce`) | 10.x | 不可变式深层更新 |
| nanoid | 5.x | id 生成 |

### 2.2 后端

| 技术 | 用途 |
|------|------|
| FastAPI | HTTP API：`/api/health`、`/api/models`、`/api/upload-image-url`、`/api/generate-image`、**`/api/workflow/run-node`** |
| httpx | 同步 HTTP 客户端，调用外部图生图网关（带重试） |
| dashscope | 通义 Qwen 等调用路径 |
| alibabacloud-oss-v2 | 将 dataURL 上传 OSS，返回公网 URL |
| Pillow | 图像辅助（如豆包尺寸计算） |
| uvicorn | ASGI 服务 |

---

## 3. 仓库目录结构（导读）

仓库按 **前端 `src/`**、**后端 `backend/app/`**、**文档 `doc/` + `docs/`**、**启动脚本** 组织。以下为 **导读**；**每一个源码文件的相对路径、行数（`wc -l`）、职责** 见：

- [§18 前端源码文件全表](#18-前端源码文件全表)（参与构建的 `src/**/*.ts(x)`，**不含** `src/_archive/`）
- [§18.10 归档代码](#1810-src_archive不参与构建)（重构后无引用的旧模块）
- [§19 后端 Python 源码文件全表](#19-后端-python-源码文件全表)（`backend/**/*.py`）
- [§20 根目录脚本与配置](#20-根目录脚本与配置)（`vite.config.ts`、`start-dev.sh`、`index.html`、本文档）

**短文档（给 AI / 日常维护）**：[`docs/AI_CONTEXT.md`](../docs/AI_CONTEXT.md)、[`docs/MAINTENANCE_GUIDE.md`](../docs/MAINTENANCE_GUIDE.md)、[`docs/ROADMAP.md`](../docs/ROADMAP.md)。

### 3.1 前端 `src/` 树（当前真实布局）

```text
src/
├── main.tsx                 → ./app/App
├── app/                     # 应用壳（顶栏、侧栏、CanvasArea、EditorModals）
├── components/              # StageCanvas、FloatingToolbar、workflow/WorkflowNodeView 等
├── canvas/                  # layers、elements、interaction、hooks、utils/coordinates
├── image-tools/             # crop/、mask/（裁剪与 AI 蒙版编辑器）
├── ai/                      # api/、generation/、workflow/（单步生图与工作流 HTTP）
├── editor/                  # types、export、store/、commands/
├── workflow/                # nodeRegistry、nodes/、utils/unifiedGraph
├── lib/
└── _archive/                # 不参与 tsc/Vite（见 §18.10）
```

**体量提示**：`WorkflowNodeView.tsx`、`workflowSlice.ts`、`StageCanvas.tsx`、`RightSidebar.tsx`、`unifiedGraph.ts` 为当前行数较多的单文件；应用编排已收敛到 `src/app/App.tsx`（约 250 行），不再使用根目录 `src/App.tsx`。

---

## 4. 核心数据模型

### 4.1 元素类型（discriminated union）

定义见 `src/editor/types.ts`。所有元素共享 `BaseElement`：`id`、`name`、`type`、`x/y/width/height`、`rotation`、`opacity`、`visible`、`locked`、`parentId?`。

| `type` | 说明 | 特有字段（摘要） |
|--------|------|------------------|
| `image` | 位图图层 | `src`；**裁剪**：`cropOffsetX/Y`、`cropScale`、`cropRotation`；**展示蒙版**：`maskShape`、`cornerRadius`；**滤镜**；**AI 蒙版**：`aiMask`；可选 **`nodeMeta`**：声明图片作为「图像节点」对外暴露的 **输出端口**（`image` / `mask`），供连线 UI 使用 |
| `rect` | 矩形 | `fill`、`radius`、`stroke*` |
| `text` | 文字 | `text`、`fontSize`、`fontFamily`、`align` 等 |
| `arrow` | 箭头 | `stroke`、`strokeWidth` |
| `group` | 组合 | `children: string[]`；子元素通过 `parentId` 指向组 |

### 4.2 页面与工程 JSON

```mermaid
erDiagram
  ProjectJSON ||--o{ Page : pages
  Page ||--o{ CanvasElement : elements
  Page ||--o{ WorkflowNode : aiNodes
  Page ||--o{ NodeEdge : edges
  ImageElement ||--o| ImageMaskData : aiMask
  ImageMaskData ||--o{ MaskStroke : strokes
```

| 类型 | 字段要点 |
|------|-----------|
| `Page` | `id`、`name`、`elements: CanvasElement[]`、**`aiNodes: WorkflowNode[]`**、**`edges: NodeEdge[]`**；旧字段 **`workflow?: WorkflowGraph`** 已废弃，由 `migratePage` 迁到 `aiNodes`/`edges` |
| `ProjectJSON` | `version`（如 `"2.0.0"`）、`savedAt`、`pages`（已含各页的 `aiNodes`/`edges`）、`activePageId` |
| `ImageMaskData` | `version`、`width`、`height`、与画布元素框一致的逻辑分辨率、`strokes[]` |
| `MaskStroke` | `tool: brush|eraser`、`points`（扁平 `[x0,y0,x1,y1,...]`）、`color`、`size`、`opacity`、`hardness` |

### 4.3 画布 AI 工作流相关类型（`src/workflow/types.ts`）

| 类型 | 含义 |
|------|------|
| `WorkflowNode` | 画布上 AI 功能节点实例：`id`、`type`、`title`、`x/y/width/height`、`status`、`params`、`outputs`（如 `image` 的 `url`）、`error?` 等 |
| `NodeEndpoint` | 连线端点：**图片元素端口** `kind: "image-element"`（`image` \| `mask`）或 **AI 节点端口** `kind: "ai-node"` |
| `NodeEdge` | 有向边：`from` → `to` 均为 `NodeEndpoint`，带 `dataType`（与端口类型一致） |
| `WorkflowNodeDefinition` | 注册表中的 **类型定义**：`inputs`/`outputs` 端口、`params`、`executor`（后端 executor id 或 `"none"`）、`showRunBar` 等 |
| `EditorMode` | 当前仅 **`"canvas"`**（统一画布，已无独立「纯工作流页」模式） |

---

## 5. Zustand 状态管理

### 5.1 `EditorState` 与 Store 扩展

`EditorState`（`types.ts`）除画布与视口外，还包含 **工作流 UI 状态**：

| 字段 | 作用 |
|------|------|
| `editorMode` | 恒为 `canvas`（保留字段，便于将来扩展） |
| `selectedWorkflowNodeIds` | 多选 AI 节点 id；与 `selectedIds` 互斥策略见 store（选节点时常清空元素选区） |
| `workflowConnecting` | 从端口拖线中的临时状态（起点端点、指针世界坐标、`dataType`） |
| `workflowNodePicker` | 松手后弹出 **创建节点** 选择器的位置与上下文 |

`Store` 类型与实现分布在 **`src/editor/store/`**（见 [§5.4](#54-store-模块拆分与文件规模)）；对外仍通过 **`src/editor/store.ts`** 重导出 `useEditorStore` 与各工具函数。`Store` 另含非持久化 UI 标志、历史、剪贴板及大量方法，摘要：

| 字段 / 方法 | 作用 |
|-------------|------|
| `marqueeSelecting` | 框选中：用于隐藏浮动条 |
| `floatingToolbarSuppressed` | 拖动画布 / 元素 / 变换时抑制浮动条 |
| `historyPast` / `historyFuture` | 撤销重做；快照类型 `Snapshot` 含 **`pages`、`activePageId`、`selectedIds`、`selectedWorkflowNodeIds`、`zoom`、`pan`** |
| `clipboard` | 复制粘贴（画布元素或工作流子图，见 `EditorClipboard`） |
| `commitHistory` | 推入快照；`updateElement` 等默认会先 `commitHistory`（可用 `options.history: false` 关闭） |
| `replaceImageKeepFrame` | 换 `src` 并重置裁剪与 `aiMask` |
| `setImageAIMask` / `clearImageAIMask` | AI 蒙版写入 |
| **`addWorkflowNode` / `updateWorkflowNode` / `removeWorkflowNode`** | AI 节点 CRUD |
| **`addWorkflowEdge` / `removeWorkflowEdge`** | 统一图边 |
| **`startWorkflowConnecting` / `updateWorkflowConnectingPointer` / `cancelWorkflowConnecting`** | 连线交互 |
| **`createWorkflowNodeFromPicker`** | 从选择器创建节点并自动接好一条入边（若兼容） |
| **`runWorkflowNode`** | 运行节点：`output-view` 等 **纯前端** 分支；否则 `serializeWorkflowInputsForApi`（失败不置 `running`）→ `running` → **`executeWorkflowNodeRemoteRun`**（`workflowRunner`）→ **`POST /api/workflow/run-node`** → 写回 `outputs` |
| **`sendWorkflowResultToCanvas`** | 将节点某路 `image` 输出落成画布 `ImageElement` |
| `exportProjectJSON` / `loadProjectJSON` | 完整工程（**含每页 `aiNodes`/`edges`**）；`load` 时 `migratePage` |
| `saveLocal` | 立即写 `localStorage`（**未**走防抖与瘦身逻辑；见 [§13](#13-保存与加载-json--localstorage)） |
| `saveRemote` / `loadRemote` | `fetch` POST/GET `ProjectJSON` |

### 5.2 历史记录边界

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Mutating: updateElement / addElement / ...
  Mutating --> Idle: Immer set 完成
  note right of Mutating
    commitHistory 先拍快照再改当前状态
    undo 恢复 historyPast 栈顶
  end note
```

**要点**：`renamePage`、部分 UI 标志位可能 **不** 入历史；工作流节点在 **`runWorkflowNode` 成功/失败收尾** 或 **`output-view` 同步完成** 时会 `commitHistory`，而运行中的 `running` 更新通常 `history: false`。

**手势合并（阶段 9）**：拖拽、多选 **Transformer** 缩放/旋转在 **`editor/commands/interactionGestureHistory.ts`** 内用引用计数，只在手势 **开始/结束** 各 `commitHistory` 一次，避免 `onDragMove` / `transform` 中间态重复入栈。画布元素侧入口见 `canvas/elements/commonProps.ts`、`GroupElementNode.tsx`。

### 5.3 自动持久化（`localStorage`）

- **键名**：`STORAGE_KEY` = `AI_CANVAS_PRO_PROJECT_V2`（`src/editor/store/constants.ts`）。
- **触发**：`useEditorStore.subscribe` 在 **每次 `setState` 后** 调度一次写入（**防抖约 600ms**），合并短时间内的连续更新（框选、抑制浮动条等），避免同步 `JSON.stringify` 整包 `pages` 造成卡顿。
- **写入字段**：`pages`、`activePageId`、`zoom`、`pan`、`quickToolbarConfig`、`editorMode`。
- **配额与异常**：`tryWriteProjectToLocalStorage` 内 **`try/catch`**；若 `QuotaExceededError`，对 **克隆体** 中长 **`data:`** URL（画布大图、节点 `image`/`mask` 输出）按阈值 **替换为 1×1 占位 PNG** 后分级重试，**不向业务逻辑抛异常**（避免拖拽/连线因 `setItem` 失败而卡死）。
- **选择状态**：`selectedIds` / `selectedWorkflowNodeIds` **默认不落盘**（加载后清空或按需初始化）。

### 5.4 Store 模块拆分与文件规模

编辑器状态已从单文件 **`store.ts`** 拆为 **`src/editor/store/`** 目录：`index.ts` 中 `create` 合并各 slice，`store.ts` 仅作 **兼容入口**（约 10 行）。持久化逻辑在 `persistence/`；纯函数在 `helpers/`。

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/editor/store.ts` | 10 | 对外 re-export：`useEditorStore`、`STORAGE_KEY`、`clone`、`fallback`、`getImageDefaults`、`makeImage` 与类型 |
| `src/editor/store/index.ts` | 47 | `create<Store>()`、合并全部 slice、`setupAutoPersist`、再次导出公共符号 |
| `src/editor/store/types.ts` | 144 | `Snapshot`、`EditorClipboard`、`Store` 完整类型 |
| `src/editor/store/constants.ts` | 7 | `STORAGE_KEY`、防抖毫秒数、持久化占位小图常量 |
| `src/editor/store/initialState.ts` | 75 | `getInitial()`：读 `localStorage`、合并快捷条默认、`migratePage` |
| `src/editor/store/sliceTypes.ts` | 5 | `StoreSet` / `StoreGet` 别名 |
| `src/editor/store/helpers/clone.ts` | 3 | 深拷贝 `clone` |
| `src/editor/store/helpers/imageDefaults.ts` | 61 | `fallback` 图 URL、`getImageDefaults`、`makeImage` |
| `src/editor/store/helpers/geometry.ts` | 32 | 多选元素包围盒 `getBounds` |
| `src/editor/store/helpers/workflowEndpoint.ts` | 8 | 端口端点字符串键 `endpointKey` |
| `src/editor/store/helpers/pageMigration.ts` | 36 | `migratePage`、`makeDefaultPage` |
| `src/editor/store/persistence/localStoragePersist.ts` | 95 | `tryWriteProjectToLocalStorage`：配额与长 `data:` 瘦身 |
| `src/editor/store/persistence/setupAutoPersist.ts` | 26 | `subscribe` + 防抖调度持久化 |
| `src/editor/store/slices/historySlice.ts` | 67 | `commitHistory`、`undo`、`redo` |
| `src/editor/store/slices/selectionSlice.ts` | 34 | 选区、`selectAll`、`setSelectedWorkflowNodeIds` |
| `src/editor/store/slices/elementSlice.ts` | 152 | `getActivePage`、`getSelectedElements`、元素 CRUD、蒙版、换图 |
| `src/editor/store/slices/clipboardSlice.ts` | 141 | `copy` / `paste`、空剪贴板常量 |
| `src/editor/store/slices/arrangeSlice.ts` | 162 | 对齐、分布、图层前移后移顶底 |
| `src/editor/store/slices/groupSlice.ts` | 78 | `groupSelected` / `ungroupSelected` |
| `src/editor/store/slices/viewportSlice.ts` | 11 | `setZoom`、`setPan`、`setTool`、`setEditingTextId` |
| `src/editor/store/slices/uiSlice.ts` | 33 | 快捷条配置、框选/浮动条抑制、`setEditorMode` |
| `src/editor/store/slices/pageSlice.ts` | 128 | 页面增删改复制、切换活动页 |
| `src/editor/store/slices/projectSlice.ts` | 103 | 导入导出 JSON、`saveLocal`、远程 save/load |
| `src/editor/store/slices/workflowSlice.ts` | 406 | 工作流节点/边/连线 UI/选择器、`runWorkflowNode`、结果落画布 |

---

## 6. React 组件职责

下表「行数」为 `wc -l` 统计的物理行数，随提交变化；与 [§18](#18-前端源码文件全表) 一致。

| 组件 / 文件 | 行数 | 与 Store 的关系 | 主要职责 |
|-------------|------|-----------------|----------|
| `src/app/App.tsx` | 251 | `useEditorStore()`、`useAppModals` 等 | **应用编排**：`AppShell` 槽位、右键菜单、画布区回调、`EditorModals` |
| `src/app/RightSidebar.tsx` | 491 | `useEditorStore()` | 右侧属性 / AI 生成（`AiChatPanel`）/ 占位对话 |
| `src/app/TopBar.tsx` | 180 | `useEditorStore()` | 顶栏：工具切换、加元素、素材库/AI/设置入口、撤销重做、JSON 与 Stage 导出 |
| `src/components/StageCanvas.tsx` | 423 | `zoom`/`pan`/页面/连线等 | **主画布入口**：组合 `canvas/layers/*`、hooks、拖放图片；Konva 交互核心仍在此文件 |
| `src/components/workflow/WorkflowNodeView.tsx` | 714 | 读 `node`、写 store | 单节点 Konva：端口、预览、运行、拖拽（`dragend` 写回位置） |
| `src/components/workflow/NodePicker.tsx` | 133 | `workflowNodePicker`、创建节点 | 从端口拖线后选择节点类型的浮层 UI |
| `src/image-tools/crop/CropEditorModal.tsx` | 678 | `updateElement`、`clone` | 裁剪 Konva 场景，`cropOffset*` / `cropScale` / `cropRotation` / flip |
| `src/image-tools/mask/MaskEditorModal.tsx` | 604 | `setImageAIMask` | AI 蒙版笔刷，`aiMask.strokes` |
| `src/ai/generation/AiGenerateModal.tsx` | 305 | 表单 UI | **单步**生图弹窗；请求与落版见 `generationService.ts` |
| `src/components/AiChatPanel.tsx` | 440 | `getImageDefaults`、`useEditorStore` | 侧栏对话与附件，与画布松耦合 |
| `src/components/FloatingToolbar.tsx` | 313 | 选区、`marqueeSelecting`、`floatingToolbarSuppressed` | Portal 快捷条，世界 AABB → 屏幕坐标 |
| `src/components/QuickToolbarSettings.tsx` | 130 | `setQuickToolbarConfig` | 快捷条按钮白名单配置 UI |
| `src/components/LibraryPanel.tsx` | 123 | `addElement` 等 | 素材库入口 |
| `src/components/ContextMenu.tsx` | 117 | 右键回调 | 画布右键菜单 |
| `src/components/MiniMap.tsx` | 96 | 读 `pages`、视口 | 小地图导航 |

> **已归档**：独立 `WorkflowCanvas`、未接入的 `executeCommand` 等见 [`src/_archive/README.md`](../src/_archive/README.md)，**不参与构建**。

**原则**：**可序列化状态尽量只在 Zustand**；Modal 内临时 UI 状态用 `useState`，确认时再调用 store。

---

## 7. 画布坐标系统

### 7.1 三层坐标心智模型

| 层级 | 含义 | 典型用途 |
|------|------|----------|
| **世界坐标（World）** | 与 `CanvasElement.x/y/width/height` 及 **`WorkflowNode` 的 `x/y`** 一致 | Store、对齐、导出 JSON、浮动条 AABB、**边与端口锚点** |
| **舞台内容坐标** | `Stage` 子节点在 **应用了 `scaleX/Y=zoom` 与 `x/y=pan`** 之后的坐标系 | Konva 内部节点与 Transformer |
| **屏幕 / 客户端坐标** | 浏览器视口、`getBoundingClientRect` | 右键菜单、`FloatingToolbar` 的 `position: fixed`、**节点选择器屏幕定位** |

### 7.2 世界 ← 指针（StageCanvas 中的模式）

Stage 上监听指针时，将容器坐标转为世界坐标：

\[
x_{\text{world}} = \frac{x_{\text{pointer}} - pan_x}{zoom},\quad
y_{\text{world}} = \frac{y_{\text{pointer}} - pan_y}{zoom}
\]

（与代码中 `(point.x - pan.x) / zoom` 一致。）

### 7.3 Konva 与元素 `rotation`

Konva `Group` 默认变换顺序可理解为：**先平移到 `(x,y)`，再绕本地原点旋转**。因此计算元素在父坐标系下的 **轴对齐包围盒（AABB）** 时，应将 **本地四角** `(0,0),(w,0),(w,h),(0,h)` 旋转后再加上 `(x,y)`，而不是绕矩形中心旋转（除非节点建模不同）。浮动条若用错 pivot，旋转后会压在图层上。

### 7.4 主舞台 `Layer` 结构（性能）

主 `Stage` 使用 **3 个 `Layer`**（原为 7 层合并而来），以满足 Konva「建议 ≤3～5 层」的提示并减少合成开销：

1. **背景层** `listening={false}`：网格 + 已确定的 **边**（折线/贝塞尔，`listening={false}`）。
2. **内容层**：根级 `ElementNode` → **`ImageWorkflowPortsOverlay`**（图片端口）→ **`WorkflowNodeView`**（保证端口在 AI 节点 **下方**，避免挡输入口点击）。
3. **交互与装饰层**：对齐线、框选矩形、`Transformer`、**拖线中的临时虚线**（`Line` 上 `listening={false}`，避免挡下层点击）。

小地图等若另有独立 `Stage`，其层数单独计算。

---

## 8. 图片裁剪

### 8.1 两套「旋转」不要混

| 概念 | 存储字段 | 含义 |
|------|----------|------|
| **画布上整图旋转** | `ImageElement.rotation` | 整个图层相对画布旋转 |
| **裁剪框内源图旋转** | `cropRotation` | 仅在 **裁剪编辑器 / 绘制贴图** 时，对源位图做旋转（`export.ts` 里 `ctx.rotate(cropRotation)`） |

另外还有 **`cropOffsetX/Y`**（平移源图）、**`cropScale`**（在 cover 比例基础上的额外缩放）、**`flipX`/`flipY`**。

### 8.2 与 Konva 渲染的关系

`StageCanvas` 中图片节点使用与 `exportCroppedImageAsPNG` 一致的 **中心对齐 + cropRotation + scale + drawImage** 逻辑，保证 **屏上所见 ≈ 导出逻辑**（跨域图导出可能受 CORS 限制，代码里已有提示）。

### 8.3 裁剪数据流

```mermaid
sequenceDiagram
  participant U as 用户
  participant App as App
  participant Crop as CropEditorModal
  participant Store as useEditorStore

  U->>App: 打开裁剪
  App->>Crop: cropEditorImageId
  Crop->>Crop: 编辑 cropOffset/Scale/Rotation
  U->>Crop: 确认
  Crop->>Store: updateElement(id, patch)
  Store->>Store: commitHistory + Immer
```

---

## 9. AI 蒙版

### 9.1 数据形态

`aiMask` 为 **矢量笔划列表** + 逻辑尺寸，而非直接存 PNG。好处：可编辑、可版本迭代；请求时再栅格化。

### 9.2 栅格化与上传

`MaskEditorModal` 在保存时组装 `ImageMaskData` → `setImageAIMask`。

`AiGenerateModal` / `generationService` 在请求前调用 `exportImageMaskToDataURL`（`src/image-tools/mask/maskRasterize.ts`）：离屏 `canvas` 上按 stroke 重放路径，**橡皮**用 `globalCompositeOperation = 'destination-out'`。

前端将 `mask` 以 **dataURL** 放入 JSON；后端 `normalize_request_images` 内 **`ensure_url` → OSS**，网关侧始终收到 **http(s) URL**。

```mermaid
flowchart LR
  subgraph fe["前端"]
    Strokes["aiMask.strokes"]
    Raster["exportMaskToDataURL"]
    POST["POST /api/generate-image"]
  end
  subgraph be["后端"]
    OSS2["ensure_url → OSS"]
    GW2["模型网关"]
  end
  Strokes --> Raster --> POST --> OSS2 --> GW2
```

---

## 10. AI 生图调用流程

产品上有 **两条并行能力**：

| 入口 | 用途 | 典型 API |
|------|------|----------|
| **`AiGenerateModal`** | 选中图层后的 **单步**生图 / 图生图 / inpaint | `POST /api/generate-image` |
| **画布 `WorkflowNode`** | **多节点图**、端口依赖、可组合多步（每步一次 `run-node` 或前端同步） | `POST /api/workflow/run-node`（见 [§17](#17-画布-ai-节点工作流当前实现)） |

### 10.1 模式判定（`AiGenerateModal`）

| 条件 | `mode`（示意） | 行为 |
|------|------------------|------|
| 选中图 + 有 `aiMask` + 导出蒙版成功 | `inpaint` | 传 `image` + `mask` |
| 选中图、无蒙版 | `image-to-image` | 仅 `image` |
| 未选中图或非图 | `generate` | 可无图 |

### 10.2 结果落画布（单步弹窗）

| 条件 | 结果 |
|------|------|
| `outputMode === "replace-selected"` 且选中单图 **且无** 蒙版 | `replaceImageKeepFrame(id, url)`：只换 `src`，外框与蒙版形状等保留策略见 store |
| 其它 | `generationService` 内 `layoutNewAiImageBox`（`ai/generation/generationLayout.ts` → `lib/aiImageLayout.ts`）计算新图外框，`addElement` 新 `ImageElement` |

### 10.3 端到端时序（单步）

```mermaid
sequenceDiagram
  participant UI as AiGenerateModal
  participant Vite as Vite 代理
  participant API as FastAPI router
  participant Gen as providers.generate_image
  participant OSS as OSS ensure_url
  participant M as 模型网关

  UI->>UI: 组装 payload traceId
  UI->>Vite: POST /api/generate-image
  Vite->>API: 转发 localhost:API_PORT
  API->>Gen: run_generate_image
  Gen->>OSS: image/mask dataURL 上传
  OSS-->>Gen: 公网 URL
  Gen->>M: httpx / dashscope
  M-->>Gen: 结果 URL 或 base64
  Gen-->>API: url + uploaded 元数据
  API-->>UI: JSON url
  UI->>UI: generationService → loadImageNaturalSize + layout + addElement
```

### 10.4 与后端模型表对齐

前端 `AiGenerateModal` 中的 `PROVIDERS` / `MODEL_CHOICES` 应与各 `backend/app/providers/*.py` 中的 `models` 列表及网关文档 **保持一致**，否则 UI 可选到后端不认识的 model。

---

## 11. Python 后端

### 11.1 分层

```mermaid
flowchart TB
  subgraph http["HTTP api/v1"]
    R["generation.py / upload.py / models.py / workflow.py"]
  end
  subgraph svc["services"]
    GS["generation_service.py"]
    US["upload_service.py"]
    WS["workflow_service.py"]
  end
  subgraph prov["providers"]
    PR["registry + banana/doubao/…"]
  end
  subgraph ex["executors"]
    EX["registry + image_nodes …"]
  end
  subgraph stor["storage"]
    O["oss.py"]
  end
  R --> GS
  R --> US
  R --> WS
  GS --> US
  GS --> PR
  WS --> EX
  US --> O
```

| 模块 | 职责 |
|------|------|
| `api/v1/workflow.py` | **`POST /workflow/run-node`**：校验体 → `workflow_service.run_node` |
| `services/workflow_service.py` | 按 **`nodeType`** 从 **`executor_registry`** 取执行器，传入序列化后的 `inputs` / `params` / `traceId` |
| `executors/*.py` | 节点类型到具体计算/转调（可内部再调 OSS、网关或纯 Python 图像逻辑） |
| `api/v1/*.py`（其余） | 参数绑定、HTTP 异常、`request_id` |
| `services/generation_service.py` | 单步生图：归一化 image/mask URL、选 provider、组装响应、日志 |
| `services/upload_service.py` | dataURL → `storage.ensure_url` |
| `providers/*.py` | 各厂商单步生图：构建 payload、`httpx` 或 Dashscope、解析 `url` |
| `utils/http.py` | `post_json_with_retry`（网络/5xx/429 重试） |
| `storage/oss.py` | 上传字节流 / dataURL |
| `middleware/request_logging.py` | 请求日志、耗时 |

### 11.2 环境变量（概念分组）

| 类别 | 示例变量 | 用途 |
|------|-----------|------|
| 网关与密钥 | `BANANA_API_KEY`、`DOUBAO_API_KEY`、`COMFLY_BASE_URL` 等 | 调用外部 API |
| OSS | `OSS_ACCESS_KEY_ID`、`OSS_SECRET`、`OSS_ENDPOINT`、`OSS_BUCKET`、`OSS_PUBLIC_BASE_URL` 等 | 上传与返回 URL |
| 服务 | `API_PORT` | 与 Vite 代理一致 |
| 调试 | `RETURN_RAW_RESPONSE` | 是否在响应中带原始上游 JSON |

具体以 `backend/app/core/settings.py`、`backend/app/storage/oss.py` 为准。

---

## 12. OSS 上传

### 12.1 `ensure_url` 行为

| 输入 | 输出 |
|------|------|
| `null` / 空 | `null` |
| `http(s)://...` | **原样返回**（认为已是网关可拉取的 URL） |
| `data:image/...;base64,...` | 解码 → 临时文件 → **PUT OSS** → 返回 `OSS_PUBLIC_BASE_URL + key` |

### 12.2 对象键与追溯

`generate_oss_object_key` 会混入 `traceId`、`api_name`（如 `source` / `mask` / `ref0`）、日期与随机散列，便于在桶内按业务追踪。

```mermaid
flowchart LR
  IN["dataURL 或 URL"]
  IN --> DEC{类型?}
  DEC -->|http| OUT1["直接返回"]
  DEC -->|dataURL| UP["OSS put_object_from_file"]
  UP --> OUT2["公网 URL"]
```

---

## 13. 保存与加载 JSON / localStorage

### 13.1 「保存」路径对照

| 机制 | API / 位置 | 说明 |
|------|--------------|------|
| **自动** | `useEditorStore.subscribe` → **`tryWriteProjectToLocalStorage`** | **防抖**；**配额保护**；见 [§5.3](#53-自动持久化localstorage) |
| **手动立即写盘** | `saveLocal()` | 直接 `JSON.stringify` + `setItem`，**不**含防抖与瘦身；大项目慎用 |
| **手动导出文件** | `exportProjectJSON` + `downloadJSON`（`export.ts`） | 用户下载 `ProjectJSON`（**含 `aiNodes`/`edges`**） |
| **手动选文件导入** | `readJSONFile` + `loadProjectJSON` | `migratePage` 迁移旧页；失败时 UI alert |
| **远程** | `saveRemote(url)` / `loadRemote(url)` | `fetch` POST/GET；**需自备**接受/返回 `ProjectJSON` 的服务 |

### 13.2 `ProjectJSON` 与 `localStorage` 快照的差异

| 内容 | `ProjectJSON` 文件 | `localStorage` 自动快照 |
|------|-------------------|------------------------|
| `pages`（含 `aiNodes`、`edges`） | ✓ | ✓ |
| `activePageId` | ✓ | ✓ |
| `zoom`、`pan` | 导出结构以 store 为准 | ✓ |
| `quickToolbarConfig` | 默认导出体可能不含；以 `exportProjectJSON` 实现为准 | ✓ |
| `editorMode` | 随 `pages` 持久化需求可选 | ✓ |
| `selectedIds` / `selectedWorkflowNodeIds` | 一般不依赖 | **不**写入自动快照 |

若超大 **`data:`** 图导致配额命中，自动快照可能已将长 data URL **替换为占位图**；**以导出文件为准**做完整备份更可靠；生产环境建议 **大图走 OSS URL**，减少 `pages` 体积。

---

## 14. 典型用户操作数据流

### 14.1 移动与吸附

用户拖曳 Group → `StageCanvas` `dragBoundFunc` / `dragend` → `updateElement` 更新 `x,y`（可能合并吸附与组合子项相对位移）。

### 14.2 变换缩放

Transformer `transformend` → 将 `scaleX` 等收敛到 `width/height`（代码里对图片/矩形等有统一处理）→ `updateElement`。

### 14.3 组合

多选 → `groupSelected`：计算包围盒，新建 `group` 元素，子元素设 `parentId`。

### 14.4 AI 局部重绘闭环（单步弹窗）

选中图片 → 打开蒙版编辑 → 笔划 → 保存写入 `aiMask` → 打开生图 Modal → 带 `mask` dataURL 请求 → 后端上传 OSS → 网关 inpaint → 新图层或替换策略。

```mermaid
flowchart TB
  A[选中 Image] --> B[MaskEditorModal]
  B --> C["setImageAIMask"]
  C --> D[AiGenerateModal]
  D --> E["POST /api/generate-image"]
  E --> F["addElement / replace"]
```

### 14.5 画布工作流（节点 + 连线）

```mermaid
flowchart TB
  P[从输出端口拖线] --> Q{落点}
  Q -->|画布空白/完成| R[openWorkflowNodePicker]
  Q -->|另一节点输入口| S[completeWorkflowConnectingToInput]
  R --> T[createWorkflowNodeFromPicker]
  S --> U[addWorkflowEdge]
  T --> V[runWorkflowNode]
  U --> V
  V --> W{executor}
  W -->|none + 特殊类型| X[前端逻辑 如 output-view]
  W -->|后端| Y["POST /api/workflow/run-node"]
  Y --> Z[updateWorkflowNode outputs]
```

---

## 15. 容易混淆的问题

| 混淆点 | 说明 |
|--------|------|
| **元素 `rotation` vs `cropRotation`** | 前者是图层在画布上转；后者只影响「框内如何切源图」。 |
| **展示蒙版 `maskShape` vs AI 蒙版 `aiMask`** | 前者是 **clip 形状**（圆角矩形/圆）；后者是 **笔刷栅格语义**，用于 inpaint。 |
| **世界坐标 AABB vs Konva `getClientRect`** | 若自算 AABB，旋转 pivot 必须与 Konva 一致（见第 7 节）。 |
| **`parentId` 与 `group.children`** | 当前数据模型二者并存；修改组合逻辑时需保持同步，避免孤儿引用。 |
| **历史栈与 `updateElement`** | 默认每次 `updateElement` 会 `commitHistory`；高频事件若在中间态也入栈会导致撤销粒度异常——**工作流节点拖拽**应避免在 `onDragMove` 写回 `x/y`，在 `dragend` 一次性提交。 |
| **`localStorage` 与 `QuotaExceededError`** | 自动订阅路径已 **防抖 + try/catch + 长 data URL 瘦身**；`saveLocal` 仍可能因过大而失败，重要工程请用 **导出 JSON** 或远程。 |
| **旧 `Page.workflow` vs `aiNodes`/`edges`** | 加载时走 `migratePage`；新代码只应维护 **统一图** 模型。 |
| **跨域图片** | `crossOrigin = anonymous` 仍可能因 CDN 策略无法 `toDataURL`；导出 PNG 会失败，需换同源或代理。 |
| **`/api` 路径** | 开发环境依赖 Vite 代理；生产部署需 **同源反向代理** 或改 `fetch` 基地址。 |
| **端口** | `vite.config.ts` 默认 `API_PORT=13555` 与 `package.json` 中 uvicorn 一致；只改一端会 502。 |
| **控制台里的 `chrome-extension://…`** | 多为浏览器扩展注入脚本失败，**与本仓库无关**；可用无痕/禁用扩展排除。 |

---

## 16. 如何扩展

分主题操作指南（步骤清单与易漏点）见 **`docs/guides/`**：

- [新增画布元素类型](docs/guides/add-new-element-type.md)
- [新增 AI 工作流节点](docs/guides/add-new-workflow-node.md)
- [新增 AI Provider（单步生图）](docs/guides/add-new-ai-provider.md)
- [调试画布坐标](docs/guides/debug-canvas-coordinates.md)

以下为与上表对应的摘要。

### 16.1 扩展「单步生图」弹窗

| 步骤 | 做法 |
|------|------|
| 新增后端能力 | `schemas/generation.py` 等增加可选字段 → 扩展 `providers/*.py` 或注册新 provider → `generation_service` |
| 新增前端参数 | `AiGenerateModal` 表单并入 `payload`；与后端字段名对齐 |

### 16.2 扩展「画布 AI 节点」

| 步骤 | 做法 |
|------|------|
| 定义 | 在 `src/workflow/nodes/<name>.ts` 导出 **`WorkflowNodeDefinition`**（`type`、`inputs`/`outputs`、`params`、`executor`、`showRunBar?`、`preview?` 等），并在 **`nodeRegistry.ts`** 注册 |
| 后端执行器 | 在 `backend/app/executors/` 实现并在 **`executor_registry`** 按 **`nodeType`** 注册；与定义里的 **`executor`** 字符串一致 |
| 序列化 | 若输入来自上游边，检查 **`serializeWorkflowInputsForApi` / `resolveAiNodeInputs`** 是否需要新端口 id 或类型分支 |
| 纯前端节点 | `executor: "none"`，必要时 `showRunBar: true`；在 **`runWorkflowNode`** 内为特定 `node.type` 写分支（参考 `output-view`） |

### 16.3 扩展画布元素类型

在 `types.ts` 增加 `ElementType` 与联合成员；`canvas/elements/ElementNode` 与各 `*ElementNode` 增加渲染分支；注意 **`export.ts`** 与组合/对齐逻辑。

### 16.4 与 Cursor / SDK 自动化结合

优先通过 **`ProjectJSON`** 或 **store 级 API**（`loadProjectJSON`、`setSelectedIds`、`replaceImageKeepFrame`、`runWorkflowNode` 等）交换，而非模拟 UI 点击。

---

## 17. 画布 AI 节点工作流（当前实现）

### 17.1 统一图模型

- 每张 **`Page`** 同时持有 **`elements`**（位图/矢量等）与 **`aiNodes`**（AI 功能块），用 **`edges`** 连接 **图片元素端口** 与 **AI 节点端口**（或 AI→AI）。
- **旧** `Page.workflow`（仅 AI 子图）由 **`migrateLegacyWorkflowGraph` / `migratePage`** 在加载时迁到 `aiNodes` + `edges`。

### 17.2 前端注册表与创建

- **`WORKFLOW_NODE_REGISTRY`**：`type` → `WorkflowNodeDefinition`。
- **`createWorkflowNode(type, x, y)`**：生成运行时 `WorkflowNode`（默认尺寸、初始 `params` 等）。
- **`listCreatableWorkflowNodes(fromDataType)`**：从端口拖线创建时，过滤 **可接收该数据类型** 的节点定义。

### 17.3 运行路径

```mermaid
sequenceDiagram
  participant UI as WorkflowNodeView
  participant Store as useEditorStore
  participant API as POST /api/workflow/run-node
  participant EX as executor_registry

  UI->>Store: runWorkflowNode(id)
  Store->>Store: resolve inputs serializeWorkflowInputsForApi
  alt output-view 等纯前端
    Store->>Store: updateWorkflowNode outputs
  else 后端 executor
    Store->>API: nodeType inputs params traceId
    API->>EX: run
    EX-->>API: outputs dict
    API-->>Store: JSON outputs
    Store->>Store: updateWorkflowNode success/error
  end
```

### 17.4 与单步生图的关系

- **单步弹窗**走 **`/api/generate-image`** 与 **`providers`** 体系。
- **工作流节点**走 **`/api/workflow/run-node`** 与 **`executors`** 体系；前端 HTTP 封装在 **`src/ai/workflow/api/workflowApi.ts`**，编排见 **`workflowRunner.ts`**。二者可复用同一 OSS/网关能力，但 **路由与注册表分离**，扩展时勿混用。

---

## 附录 A：关键文件速查（按主题）

| 主题 | 文件 |
|------|------|
| 编辑器类型 | `src/editor/types.ts` |
| 工作流类型 | `src/workflow/types.ts` |
| 状态入口 | `src/editor/store.ts`（re-export）→ `src/editor/store/index.ts` |
| 主画布 | `src/components/StageCanvas.tsx` + `src/canvas/*` |
| 坐标换算 | `src/canvas/utils/coordinates.ts` |
| 手势历史 | `src/editor/commands/interactionGestureHistory.ts` |
| 工作流节点视图 | `src/components/workflow/WorkflowNodeView.tsx` |
| 节点注册与定义 | `src/workflow/nodeRegistry.ts`、`src/workflow/nodes/*.ts`（**不含** `_archive` 内旧 input 节点） |
| 统一图工具 | `src/workflow/utils/unifiedGraph.ts`、`runPayload.ts`、`createNode.ts` |
| 单步 AI | `src/ai/generation/*`、`src/ai/api/generationApi.ts` |
| 工作流运行（前端） | `src/ai/workflow/services/workflowRunner.ts`、`workflowApi.ts` |
| 蒙版栅格化 | `src/image-tools/mask/maskRasterize.ts` |
| 裁剪导出 | `src/editor/export.ts` |
| 归档（不参与构建） | `src/_archive/README.md` |
| 后端入口 | `backend/app/main.py` |
| 单步生图编排 | `backend/app/services/generation_service.py`、`backend/app/providers/` |
| 工作流节点 API | `backend/app/api/v1/workflow.py`、`services/workflow_service.py`、`executors/` |
| OSS | `backend/app/storage/oss.py` |
| 开发代理 | `vite.config.ts` |

---

## 18. 前端源码文件全表

以下列出 **参与构建** 的 `src/**/*.ts` 与 `src/**/*.tsx`（**不含** `src/_archive/`，该目录已在 `tsconfig.app.json` 中 `exclude`）。**行数** 为 `wc -l` 物理行数；**合计约 11263 行**（2026-05-15 统计）。归档文件见 [§18.10](#1810-src_archive不参与构建)。

### 18.1 `src/` 根与入口

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/main.tsx` | 10 | Vite + React 挂载；`import App from "./app/App"` |
| `src/vite-env.d.ts` | 1 | Vite 客户端类型引用声明 |

### 18.2 `src/components/`（UI 与 Konva）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/components/AiChatPanel.tsx` | 440 | 侧栏 AI 对话、附件与简单生图辅助 |
| `src/components/ContextMenu.tsx` | 117 | 画布右键菜单 |
| `src/components/FloatingToolbar.tsx` | 313 | 选中元素上方 HTML 快捷工具条 |
| `src/components/LibraryPanel.tsx` | 123 | 素材库面板 |
| `src/components/MiniMap.tsx` | 96 | 画布小地图与视口框 |
| `src/components/QuickToolbarSettings.tsx` | 130 | 快捷条按钮配置 UI |
| `src/components/StageCanvas.tsx` | 423 | 主 Stage：网格、边、元素、端口、工作流节点、框选、快捷键与拖线；Transformer 逻辑见 `canvas/hooks/useStageTransformer` |

### 18.2b `src/image-tools/`（裁剪与蒙版）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/image-tools/crop/CropEditorModal.tsx` | 678 | 裁剪编辑器 Konva 子场景，写回裁剪字段 |
| `src/image-tools/mask/MaskEditorModal.tsx` | 604 | AI 蒙版笔刷编辑器 |
| `src/image-tools/mask/maskRasterize.ts` | 51 | 蒙版笔划栅格化为 PNG dataURL（`exportMaskToDataURL` / `exportImageMaskToDataURL`） |

### 18.2c `src/canvas/`（分层、元素、交互）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/canvas/layers/BackgroundLayer.tsx` | 67 | 背景网格层 |
| `src/canvas/layers/ContentLayer.tsx` | 10 | 内容层槽位（元素、边、节点由 StageCanvas 注入） |
| `src/canvas/layers/InteractionLayer.tsx` | 48 | 对齐线、框选、Transformer、临时连线 |
| `src/canvas/elements/ElementNode.tsx` | 43 | 按 `type` 分发到各 `*ElementNode` |
| `src/canvas/elements/ImageElementNode.tsx` | 290 | 图片 Konva 节点与裁剪绘制 |
| `src/canvas/elements/GroupElementNode.tsx` | 248 | 组合容器 |
| `src/canvas/elements/TextElementNode.tsx` | 102 | 文字 |
| `src/canvas/elements/RectElementNode.tsx` | 23 | 矩形 |
| `src/canvas/elements/ArrowElementNode.tsx` | 25 | 箭头 |
| `src/canvas/elements/commonProps.ts` | 128 | 拖拽/选中/手势历史、`updateElement` 封装 |
| `src/canvas/elements/getSnap.ts` | 73 | 吸附计算 |
| `src/canvas/elements/useCanvasImage.ts` | 48 | 图片加载与跨域 |
| `src/canvas/interaction/AlignmentGuides.tsx` | 27 | 对齐参考线 |
| `src/canvas/interaction/MarqueeSelection.tsx` | 29 | 框选矩形 |
| `src/canvas/interaction/SelectionTransformer.tsx` | 54 | Transformer 包装 |
| `src/canvas/interaction/TemporaryWorkflowConnection.tsx` | 37 | 拖线中的临时贝塞尔 |
| `src/canvas/utils/coordinates.ts` | 25 | `screenToWorld` / `worldToScreen` |
| `src/canvas/utils/transformerAnchors.ts` | 103 | 变换锚点样式 |
| `src/canvas/types.ts` | 4 | 画布局部类型 |

### 18.2d `src/canvas/hooks/`

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/canvas/hooks/useCanvasPanZoom.ts` | 39 | 滚轮缩放（指针锚点） |
| `src/canvas/hooks/useMarqueeSelection.ts` | 168 | 框选与空白 mousedown；工作流连线指针；`spacePanActive` 时跳过框选 |
| `src/canvas/hooks/useStageWorkflowDblClick.ts` | 27 | 双击空白 Stage → 打开工作流节点选择 |
| `src/canvas/hooks/useStageTransformer.ts` | 79 | Transformer 与选中节点同步、`transformstart/end`、旋转柄样式 |

### 18.2e `src/ai/`（单步生图与工作流 HTTP）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/ai/api/aiClient.ts` | 18 | 通用 fetch 封装 |
| `src/ai/api/generationApi.ts` | 67 | `POST /api/generate-image` |
| `src/ai/generation/AiGenerateModal.tsx` | 305 | 单步生图 Modal UI |
| `src/ai/generation/generationService.ts` | 179 | 组 payload、请求、结果落画布 |
| `src/ai/generation/generationPayload.ts` | 56 | 请求体字段 |
| `src/ai/generation/generationTypes.ts` | 80 | 前端类型 |
| `src/ai/generation/generationLayout.ts` | 2 | re-export `lib/aiImageLayout` |
| `src/ai/workflow/api/workflowApi.ts` | 53 | `POST /api/workflow/run-node` |
| `src/ai/workflow/services/workflowRunner.ts` | 19 | 调用 API、解析响应 |
| `src/ai/workflow/services/workflowResultToCanvas.ts` | 23 | 节点输出落成 `ImageElement` |

### 18.3 `src/components/workflow/`

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/components/workflow/NodePicker.tsx` | 133 | 拖线创建节点时的类型选择器 |
| `src/components/workflow/WorkflowNodeView.tsx` | 714 | 单个 AI 节点的 Konva 视图与交互 |

### 18.4 `src/editor/`（类型、导出、快捷条）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/editor/types.ts` | 174 | `Page`、`EditorState`、`ProjectJSON`、画布元素联合类型 |
| `src/editor/export.ts` | 155 | 工程 JSON 下载/读取、滤镜与 clipPath、裁剪 PNG 导出 |
| `src/editor/quickTools.ts` | 190 | 快捷条作用域、工具 id 白名单与合并逻辑 |
| `src/editor/store.ts` | 10 | 对外 re-export store 与工具函数 |

### 18.4b `src/editor/commands/`（阶段 9：手势历史）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/editor/commands/interactionGestureHistory.ts` | 31 | 拖拽/变换手势内 `commitHistory` 引用计数 |
| `src/editor/commands/types.ts` | 18 | `ElementCommand` 描述类型（供未来 `executeElementCommand` 使用） |

> `executeCommand.ts`、`pageCommands.ts` 等占位已移至 **`src/_archive/editor/commands/`**。

### 18.5 `src/editor/store/`（Zustand 拆分）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/editor/store/index.ts` | 47 | `create<Store>`、合并 slice、`setupAutoPersist` |
| `src/editor/store/types.ts` | 144 | `Store`、`Snapshot`、`EditorClipboard` |
| `src/editor/store/constants.ts` | 7 | `STORAGE_KEY`、防抖间隔、占位图常量 |
| `src/editor/store/initialState.ts` | 75 | `getInitial`：hydrate localStorage、`migratePage` |
| `src/editor/store/sliceTypes.ts` | 5 | `StoreSet` / `StoreGet` |
| `src/editor/store/helpers/clone.ts` | 3 | `clone` |
| `src/editor/store/helpers/imageDefaults.ts` | 61 | `fallback`、`getImageDefaults`、`makeImage` |
| `src/editor/store/helpers/geometry.ts` | 32 | `getBounds` |
| `src/editor/store/helpers/workflowEndpoint.ts` | 8 | `endpointKey` |
| `src/editor/store/helpers/pageMigration.ts` | 36 | `migratePage`、`makeDefaultPage` |
| `src/editor/store/persistence/localStoragePersist.ts` | 95 | `tryWriteProjectToLocalStorage` |
| `src/editor/store/persistence/setupAutoPersist.ts` | 26 | 防抖订阅持久化 |
| `src/editor/store/slices/historySlice.ts` | 67 | 撤销 / 重做 / `commitHistory` |
| `src/editor/store/slices/selectionSlice.ts` | 34 | 选区与全选 |
| `src/editor/store/slices/elementSlice.ts` | 152 | 元素 CRUD、蒙版、换图、`getActivePage` |
| `src/editor/store/slices/clipboardSlice.ts` | 141 | 复制 / 粘贴 |
| `src/editor/store/slices/arrangeSlice.ts` | 162 | 对齐、分布、图层顺序 |
| `src/editor/store/slices/groupSlice.ts` | 78 | 组合 / 解组 |
| `src/editor/store/slices/viewportSlice.ts` | 11 | `zoom` / `pan` / `tool` / 文字编辑 id |
| `src/editor/store/slices/uiSlice.ts` | 33 | 快捷条配置、框选与浮动条抑制、`editorMode` |
| `src/editor/store/slices/pageSlice.ts` | 128 | 页面增删改复制与切换 |
| `src/editor/store/slices/projectSlice.ts` | 103 | JSON 导入导出、本地与远程保存 |
| `src/editor/store/slices/workflowSlice.ts` | 406 | 工作流节点/边/连线/运行/结果落画布 |

### 18.6 `src/lib/`

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/lib/aiImageLayout.ts` | 56 | 生图结果在画布上的摆放（间距、宽高比） |
| `src/lib/apiDebug.ts` | 56 | 前端 API 调试日志封装 |
| `src/lib/apiFormat.ts` | 17 | API 错误信息格式化 |

### 18.7 `src/workflow/`（节点定义与图工具）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/workflow/types.ts` | 163 | 工作流节点、边、端口、定义、连接状态等类型 |
| `src/workflow/nodeRegistry.ts` | 38 | `WORKFLOW_NODE_REGISTRY` 与查询辅助函数 |
| `src/workflow/nodeLayout.ts` | 62 | 节点布局几何（如端口偏移） |
| `src/workflow/portColors.ts` | 13 | 端口数据类型与描边颜色映射 |
| `src/workflow/nodes/inpaint.ts` | 91 | 局部重绘节点定义 |
| `src/workflow/nodes/outpaint.ts` | 43 | 外扩重绘节点定义 |
| `src/workflow/nodes/outputView.ts` | 41 | 输出浏览/同步类节点定义 |
| `src/workflow/nodes/styleTransfer.ts` | 91 | 风格迁移节点定义 |
| `src/workflow/nodes/upscale.ts` | 47 | 超分节点定义 |
| `src/workflow/utils/createNode.ts` | 54 | 由定义生成运行时 `WorkflowNode` |
| `src/workflow/utils/runPayload.ts` | 40 | 运行前输入序列化 `serializeWorkflowInputsForApi` |
| `src/workflow/utils/unifiedGraph.ts` | 325 | 边解析、上游输入、`migrateLegacyWorkflowGraph`（含旧 `image-input`/`mask-input` 类型迁移） |

### 18.8 `src/app/`（应用壳拆分）

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/app/App.tsx` | 251 | 编排入口：`AppShell`、`ContextMenu`、`CanvasArea` 回调、`EditorModals` |
| `src/app/AppShell.tsx` | 24 | `figma-app` / `figma-main` 布局与槽位 |
| `src/app/TopBar.tsx` | 180 | 顶栏工具条与工程导出 |
| `src/app/LeftSidebar.tsx` | 109 | 左侧大纲与图层行 |
| `src/app/RightSidebar.tsx` | 491 | 右侧属性面板与 `AiChatPanel` |
| `src/app/PageTabs.tsx` | 46 | 多页面标签与增删复制 |
| `src/app/CanvasArea.tsx` | 51 | `canvas-area`：`PageTabs`、`StageCanvas`、`MiniMap`、`FloatingToolbar` |
| `src/app/EditorModals.tsx` | 88 | 隐藏 file input、素材库、快捷条设置、单步生图与裁剪/蒙版 Modal |
| `src/app/hooks/useAppModals.ts` | 75 | Modal / 侧栏 tab / 右键菜单 / toolbar toast / 替换图状态 |
| `src/app/hooks/useProjectImportExport.ts` | 22 | 工程 JSON 选择 + `readJSONFile` → `loadProjectJSON` |
| `src/app/hooks/useStageExport.ts` | 25 | `stageRef` → `toDataURL` 导出 PNG/JPG |

### 18.10 `src/_archive/`（不参与构建）

`tsconfig.app.json` 已 `"exclude": ["src/_archive"]`。清单与恢复说明见 **`src/_archive/README.md`**。

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/_archive/components/workflow/WorkflowCanvas.tsx` | 248 | 旧独立工作流 Stage，主路径已用统一 `StageCanvas` |
| `src/_archive/editor/commands/executeCommand.ts` | 31 | `executeElementCommand` 未接入 |
| `src/_archive/editor/commands/elementCommands.ts` | 6 | 手势 API 再导出（无引用） |
| `src/_archive/editor/commands/pageCommands.ts` | 6 | 页面命令占位 |
| `src/_archive/editor/commands/workflowCommands.ts` | 6 | 工作流命令占位 |
| `src/_archive/ai/workflow/services/workflowValidator.ts` | 5 | 校验占位 |
| `src/_archive/workflow/nodes/imageInput.ts` | 27 | 旧节点定义（迁移逻辑仍在 `unifiedGraph`） |
| `src/_archive/workflow/nodes/maskInput.ts` | 27 | 同上 |

---

## 19. 后端 Python 源码文件全表

以下列出 **`backend/**/*.py`**（不含 `__pycache__`）。**后端 Python 合计约 1968 行**（`find … \| xargs wc -l` 汇总）。`__init__.py` 多为包标记（0～3 行）。

### 19.1 入口与包根

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/main.py` | 5 | 兼容入口，转发 `uvicorn` 目标 |
| `backend/__init__.py` | 1 | 包标记 |
| `backend/app/__init__.py` | 1 | 包标记 |

### 19.2 `backend/app/` 核心

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/main.py` | 33 | FastAPI 应用：CORS、路由挂载、生命周期 |
| `backend/app/core/settings.py` | 127 | Pydantic Settings：环境变量、OSS、密钥路径 |
| `backend/app/core/logging.py` | 47 | 文件日志初始化 |
| `backend/app/core/security.py` | 1 | 安全相关占位/扩展 |
| `backend/app/core/__init__.py` | 3 | 包标记 |

### 19.3 API 路由 `backend/app/api/v1/`

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/api/v1/router.py` | 12 | 聚合子路由 |
| `backend/app/api/v1/generation.py` | 30 | `POST /generate-image` 等单步生图 |
| `backend/app/api/v1/upload.py` | 26 | 上传相关路由 |
| `backend/app/api/v1/models.py` | 22 | 模型列表 / health |
| `backend/app/api/v1/workflow.py` | 26 | `POST /workflow/run-node` |
| `backend/app/api/__init__.py` | 0 | 包标记（空） |
| `backend/app/api/v1/__init__.py` | 0 | 包标记（空） |

### 19.4 Schemas

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/schemas/generation.py` | 45 | 生图请求/响应 Pydantic 模型 |
| `backend/app/schemas/upload.py` | 10 | 上传 schema |
| `backend/app/schemas/workflow.py` | 19 | `RunNodeRequest` / `RunNodeResponse` |
| `backend/app/schemas/common.py` | 13 | 公共字段 |
| `backend/app/schemas/__init__.py` | 10 | 包导出 |

### 19.5 Services

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/services/generation_service.py` | 130 | 单步生图编排：归一化图 URL、选 provider |
| `backend/app/services/upload_service.py` | 68 | dataURL/上传走 OSS |
| `backend/app/services/workflow_service.py` | 29 | 工作流节点执行调度 |
| `backend/app/services/__init__.py` | 8 | 包导出 |

### 19.6 Providers（单步生图厂商适配）

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/providers/registry.py` | 38 | provider 注册与选择 |
| `backend/app/providers/base.py` | 20 | 基类/协议 |
| `backend/app/providers/payloads.py` | 179 | 各厂商共用 payload 片段 |
| `backend/app/providers/response_parse.py` | 41 | 响应解析工具 |
| `backend/app/providers/qwen.py` | 119 | 通义等 Dashscope 路径 |
| `backend/app/providers/banana.py` | 36 | Banana 适配 |
| `backend/app/providers/doubao.py` | 34 | 豆包适配 |
| `backend/app/providers/flux.py` | 35 | Flux 适配 |
| `backend/app/providers/gemini.py` | 33 | Gemini 适配 |
| `backend/app/providers/gpt_image.py` | 38 | GPT Image 适配 |
| `backend/app/providers/ksyun.py` | 33 | 金山云适配 |
| `backend/app/providers/__init__.py` | 1 | 包标记 |

### 19.7 Executors（工作流节点）

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/executors/registry.py` | 31 | 按 `nodeType` 解析 executor |
| `backend/app/executors/base.py` | 18 | 执行器基类 |
| `backend/app/executors/image_nodes.py` | 98 | 图像类节点执行（inpaint/upscale 等） |
| `backend/app/executors/__init__.py` | 0 | 包标记（空） |

### 19.8 Storage 与 Utils

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/storage/oss.py` | 213 | OSS 上传、`ensure_url`、对象键 |
| `backend/app/storage/__init__.py` | 1 | 包标记 |
| `backend/app/utils/http.py` | 86 | 带重试的 HTTP POST JSON |
| `backend/app/utils/image.py` | 107 | 图像尺寸等工具 |
| `backend/app/utils/log_sanitize.py` | 65 | 日志脱敏 |
| `backend/app/utils/__init__.py` | 1 | 包标记 |

### 19.9 中间件与测试

| 文件 | 行数 | 职责 |
|------|------|------|
| `backend/app/middleware/request_logging.py` | 53 | 请求日志与耗时 |
| `backend/app/middleware/__init__.py` | 0 | 包标记（空） |
| `backend/tests/test_smoke.py` | 22 | 冒烟测试 |

---

## 20. 根目录脚本与配置

| 文件 | 行数 | 职责 |
|------|------|------|
| `vite.config.ts` | 23 | Vite 配置、`/api` 开发代理 |
| `start-dev.sh` | 28 | 检查依赖并启动 `npm run dev` |
| `index.html` | 13 | HTML 入口、挂载 `#root` |
| `package.json` | 31 | 依赖与 npm scripts |
| `tsconfig.json` | 4 | TS 根配置 |
| `tsconfig.app.json` | 24 | 应用 TS 编译选项；`exclude: src/_archive` |
| `doc/PROJECT_ARCHITECTURE.md` | — | 本架构学习文档；含全文清单与行数 |

---

*文档与仓库同步维护。**行数** 使用 `wc -l` 统计（2026-05-15）；参与构建源码合计约 **11263** 行，归档约 **356** 行。更新命令示例：`find src -name '*.ts' -o -name '*.tsx' | grep -v _archive | xargs wc -l`。若接口或字段变更，请同时更新「附录 A」、`docs/AI_CONTEXT.md` 与相关章节。*
