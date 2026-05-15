# AI Canvas — AI / 协作者上下文

> **读者**：后续接入的 AI 或工程师。  
> **目标**：用「当前仓库真实状态」压缩上下文，避免重复猜测与重复重构建议。  
> **维护**：重大架构或阶段完成时更新本文；细节长文仍以 `doc/PROJECT_ARCHITECTURE.md`、`doc/阶段性修改计划.md` 为准。

---

## 1. 项目一句话说明

AI Canvas 是基于 **React + Konva + Zustand + FastAPI** 的浏览器画布编辑器：普通矢量/位图编辑、图片裁剪与 AI 蒙版、**单步 AI 生图**（弹窗/侧栏），以及**画布内 AI 工作流节点**（节点 + 边 + 运行）。

---

## 2. 当前技术栈

**Frontend**

- React 19、TypeScript、Vite 6
- Konva / react-konva
- Zustand + Immer（`produce`）
- nanoid

**Backend**

- FastAPI、`httpx`
- 多 **Provider**（单步生图）、**Executor**（工作流节点）
- OSS / 上传（见 `backend/app/services/`、`storage/`）

---

## 3. 当前真实目录结构（前端 `src/`）

以下为 **2026-05 仓库实际布局**（勿与旧教程中的单文件 `App.tsx`、根目录 `CropEditorModal` 混淆）。

```text
src/
├── main.tsx                    # 入口 → ./app/App
├── app/                        # 应用壳（原巨型 App 拆分）
│   ├── App.tsx
│   ├── AppShell.tsx
│   ├── TopBar.tsx
│   ├── LeftSidebar.tsx
│   ├── RightSidebar.tsx
│   ├── PageTabs.tsx
│   ├── CanvasArea.tsx
│   ├── EditorModals.tsx
│   └── hooks/
├── components/                 # 仍偏「画布周边 UI」
│   ├── StageCanvas.tsx         # Konva Stage 入口（仍较大）
│   ├── ContextMenu.tsx
│   ├── FloatingToolbar.tsx
│   ├── LibraryPanel.tsx
│   ├── MiniMap.tsx
│   ├── AiChatPanel.tsx
│   └── workflow/               # WorkflowNodeView、NodePicker 等
├── canvas/                     # 画布分层、元素、交互子模块
│   ├── layers/
│   ├── elements/
│   ├── interaction/
│   ├── hooks/
│   └── utils/
├── image-tools/                # 裁剪 / 蒙版（从 components、editor 迁入）
│   ├── crop/
│   └── mask/
├── ai/                         # 单步生图 + 工作流 HTTP 编排
│   ├── api/
│   ├── generation/
│   └── workflow/
├── editor/                     # 类型、导出、Store、commands
│   ├── types.ts
│   ├── export.ts
│   ├── store/
│   └── commands/
├── workflow/                   # 节点定义、registry、布局、runPayload
└── lib/
```

**后端**：`backend/app/`（`api/v1`、`services`、`providers`、`executors`、`schemas`、`storage`、`core`）。

**归档（不参与构建）**：`src/_archive/` — 重构后无引用的占位/旧实现，见 `src/_archive/README.md`；`tsconfig.app.json` 已 `exclude`。

---

## 4. 当前架构分层（理解用）

1. **UI 壳**：`src/app/*`、各 Modal、侧栏、顶栏。
2. **画布**：`StageCanvas` + `src/canvas/*`（Layer、ElementNode、interaction、hooks、coordinates）。
3. **Editor Store**：`src/editor/store`（多 slice；持久化 `persistence/`）。
4. **AI 编排（前端）**：`src/ai/generation/*`、`src/ai/workflow/*`（与 store 配合，非替代 store）。
5. **API / Backend**：`/api/*` 经 Vite 代理 → FastAPI。

**原则**：复杂业务流程优先落在 **service / api 模块**；Store 保持状态与轻量 action；**不**在高频 `mousemove` 里狂写 store。

---

## 5. 已完成的重构（给 AI 的硬事实）

与 `doc/阶段性修改计划.md` 阶段 1～9 对齐（摘要）：

| 项 | 说明 |
|----|------|
| Stage 第一轮 | `canvas/utils/coordinates.ts`、`layers/Background|Content|Interaction` |
| 元素渲染 | `canvas/elements/*`、`ElementNode` 分发 |
| 交互子模块 | `canvas/interaction/*`；hooks：`useCanvasPanZoom`、`useMarqueeSelection`（含 `spacePanActive`）、`useStageWorkflowDblClick`、`useStageTransformer` |
| 单步生图服务化 | `ai/api/*`、`ai/generation/generationService.ts` 等；Modal 只做 UI |
| Workflow 运行服务化 | `ai/workflow/api/workflowApi.ts`、`workflowRunner`、`workflowResultToCanvas`；`workflowSlice` 仍协调序列化与 `running` |
| App 壳化 | 根 `src/App.tsx` **已删除** → `src/app/App.tsx` |
| image-tools | `CropEditorModal`、`MaskEditorModal`、`maskRasterize`（原 `editor/mask.ts`） |
| 扩展指南 | `docs/guides/*.md` 四篇 |
| Command / 历史 | `editor/commands/*`；**手势内** `commitHistory` 引用计数（多选 Transformer 不重复入栈）；undo 仍为 **全量快照** |

**入口**：`src/main.tsx` → `import App from "./app/App"`。

---

## 6. 未完成 / 长期项（勿写成已完成）

| 项 | 说明 |
|----|------|
| **阶段 10** | 单步生图与工作流 **统一为一套 AI 能力** — 长期 backlog，**未做**；需单独方案后再动代码 |
| **可选瘦身** | `image-tools` 内再拆 `cropMath` / `maskBrush` 等；更多调用走 `executeElementCommand` |
| **StageCanvas** | 仍承担较多编排（快捷键、拖放、context menu 等），可继续小步外移，但**非**「未拆 layers」— layers 已存在 |

---

## 7. 重点复杂文件（改动前先看）

| 路径 | 说明 |
|------|------|
| `src/components/StageCanvas.tsx` | Konva Stage、滚轮/空格、拖放图片、与 hooks 衔接；行数仍多 |
| `src/editor/store/slices/workflowSlice.ts` | 工作流 CRUD、连线、`runWorkflowNode` 与前后端分支 |
| `src/components/workflow/WorkflowNodeView.tsx` | 单节点 Konva UI、端口、运行条 |
| `src/app/App.tsx` | 编排 ContextMenu、CanvasArea、快捷键副作用与 store |
| `src/image-tools/crop/CropEditorModal.tsx` | 裁剪 Konva 子场景 |
| `src/image-tools/mask/MaskEditorModal.tsx` | 蒙版笔刷 |
| `src/workflow/utils/unifiedGraph.ts` | 边、上游输入、迁移 |

---

## 8. 当前状态管理（Store）

- **入口**：`src/editor/store/index.ts` → `useEditorStore`。
- **Slices**：`history`、`selection`、`element`、`clipboard`、`arrange`、`group`、`viewport`、`ui`、`page`、`project`、`workflow` 等（见 `editor/store/slices/`）。
- **持久化**：`persistence/setupAutoPersist`、`localStoragePersist`。
- **历史**：`commitHistory` 推全页快照；**拖拽/变换**经 `editor/commands/interactionGestureHistory.ts` 合并同手势多次 `commitHistory`。

**禁止**：无故重命名对外 action、无故改 `ProjectJSON` / `Page` 形状（除非同步迁移与文档）。

---

## 9. 画布 Canvas 当前结构

- **入口**：`StageCanvas` → 三层 `Layer`（`BackgroundLayer`、`ContentLayer`、`InteractionLayer`）。
- **元素**：`canvas/elements/ElementNode` + 各 `*ElementNode`。
- **坐标**：`canvas/utils/coordinates.ts`（`screenToWorld` / `worldToScreen`）。
- **Transformer**：`canvas/hooks/useStageTransformer.ts`（绑定节点 + `transformstart/end` + 旋转柄样式）。
- **框选 / 连线指针**：`useMarqueeSelection`；**空格平移**时 `spacePanActive` 为 true **不**在空白处启动框选。

---

## 10. AI 生图（单步）当前结构

- **UI**：`src/ai/generation/AiGenerateModal.tsx`（挂载自 `app/EditorModals.tsx`）。
- **流程**：`generationService.ts` → `generationApi.postGenerateImage` → `/api/generate-image`。
- **类型/模型表**：`generationTypes.ts`（与 `AiChatPanel` 部分共用）。

---

## 11. Workflow 当前结构

- **数据**：`Page.aiNodes`、`Page.edges`；元素侧端口与 `ImageElement` 等配合（见 `editor/types`、`workflow/types`）。
- **定义**：`src/workflow/nodes/*.ts` + `nodeRegistry.ts`。
- **创建**：`workflow/utils/createNode.ts`。
- **运行**：`workflowSlice.runWorkflowNode`（`output-view` / `executor === "none"` 等分支）→ 远端则 `executeWorkflowNodeRemoteRun` + `workflowApi`。
- **落画布**：`workflowResultToCanvas.ts`（如图片结果）。

---

## 12. 后端结构（摘要）

- `api/v1`：HTTP 路由。
- `services`：编排（如 `generation_service`、`workflow_service`）。
- `providers`：单步生图厂商适配；`executors`：按 `nodeType` 执行工作流节点。
- `schemas`：Pydantic 请求/响应。
- `storage`：OSS 等。

---

## 13. 重要约束与禁止事项

- **一次只改一个模块**；优先 **搬家式拆分**，行为不变再合并。
- **勿**同时大改 Store + Canvas + AI + App。
- **勿**随意改 `ProjectJSON` / `Page.elements` / `aiNodes` / `edges` 语义。
- **勿**在 `dragmove` 高频路径里持续 `commitHistory`。
- **勿**把巨大 dataURL 长期塞进 localStorage（注意体积）。
- **勿**未立项就「统一单步 AI 与工作流」大重写。
- **勿**引入大型框架替换当前栈（除非明确决策）。

---

## 14. 推荐下一步任务（维护向）

1. 阶段 10：仅在有 **设计文档与边界** 后启动。  
2. 可选：`image-tools` 内继续拆数学/笔刷；`executeElementCommand` 逐步替换零散 `updateElement` 调用。  
3. `StageCanvas` 继续小步外移（如键盘、拖放）— 每步可运行、可回滚。

---

## 15. 改代码前检查清单

- [ ] 是否只触达一个模块？
- [ ] 是否影响 `ProjectJSON` / 迁移？
- [ ] 是否影响 undo/redo（快照 / `commitHistory` 时机）？
- [ ] 是否影响画布坐标或 API 契约？
- [ ] 是否需要同步 `doc/阶段性修改计划.md` 或本文？

---

## 16. 改代码后测试清单（最低限度）

- [ ] `npm run build`
- [ ] 画布显示、平移缩放、**空格拖画布**
- [ ] 选择 / 拖拽 / Transformer；**多选变换后 Ctrl+Z 一次恢复**
- [ ] 撤销 / 重做
- [ ] 保存或刷新后状态（localStorage）
- [ ] 单步生图（若有密钥环境）
- [ ] 工作流：建节点、连线、运行、结果落画布
- [ ] JSON 导入导出（若改动相关）

---

## 17. 术语表

| 术语 | 含义 |
|------|------|
| Element / CanvasElement | 画布上的 rect/text/image/arrow/group |
| WorkflowNode | `Page.aiNodes` 中的 AI 功能块 |
| Edge | 端口之间的连接 |
| Page | 一页：`elements`、`aiNodes`、`edges` 等 |
| World coordinate | 与 store 中元素 `x,y` 一致的逻辑坐标 |
| Screen / client | 浏览器视口；右键菜单等用 `clientX/Y` |
| Provider | 后端单步生图厂商实现 |
| Executor | 后端按节点 `type` 执行工作流 |

---

## 18. 重构日志（摘要）

| 日期 | 内容 |
|------|------|
| 2026-05-13 | 阶段 1～9 按 `doc/阶段性修改计划.md` 落实；含 app 壳、ai、workflow API、image-tools、guides、commands、空格平移、`useStageTransformer` 等 |

（细粒度条目见 `doc/阶段性修改计划.md` 各阶段「完成记录」。）

---

## 19. 与其它文档的关系

| 文档 | 用途 |
|------|------|
| `doc/PROJECT_ARCHITECTURE.md` | 全表、数据流、坐标、后端表 — **长参考** |
| `doc/阶段性修改计划.md` | 分阶段路线与历史 checklist |
| `docs/guides/*.md` | 新增元素 / 节点 / Provider / 坐标调试 **操作步骤** |
| `docs/MAINTENANCE_GUIDE.md` | **人类**维护与学习的白话手册 |
| `docs/ROADMAP.md` | 短 checklist，与阶段状态同步 |
