# AI Canvas — 重构与维护路线图（简表）

> **已完成**项在此勾选；详细背景见 **`docs/AI_CONTEXT.md`**；文档去重见 **`docs/DOC_MAP.md`**。

## Phases（计划内）

- [x] **Phase 1** — `canvas/utils/coordinates.ts` + `BackgroundLayer` / `ContentLayer` / `InteractionLayer`
- [x] **Phase 2** — `canvas/elements/*` + `ElementNode` 分发
- [x] **Phase 3** — `canvas/interaction/*` + `canvas/hooks`（滚轮、框选/连线指针、双击、空格与框选互斥、`useStageTransformer`）
- [x] **Phase 4** — 单步生图服务化：`src/ai/generation/*`、`src/ai/api/*`
- [x] **Phase 5** — Workflow HTTP：`ai/workflow/api`、`workflowRunner`、`workflowResultToCanvas`；slice 仍管状态与序列化顺序
- [x] **Phase 6** — `src/app/*` 应用壳；入口 `main.tsx` → `./app/App`
- [x] **Phase 7** — `src/image-tools/*`（裁剪、蒙版、`maskRasterize`）
- [x] **Phase 8** — `docs/guides/*` 四篇扩展指南
- [x] **Phase 9** — `src/editor/commands/*` + 手势历史合并（快照 undo 保留）
- [ ] **Phase 10** — **长期**：统一单步 AI 与工作流 AI（未立项、未实现）

## 已完成维护任务（`doc/优化方案.md` §八 + 持续产品化）

- [x] 拆出 `useStageKeyboardShortcuts`
- [x] 拆出 `useCanvasDropImport`
- [x] 拆出 `cropMath`（`CropEditorPanel` 已接入）
- [x] 新增 `normalizeAiError`（生图 / 工作流 API）
- [x] 图层锁定 / 隐藏：渲染、框选、Transformer、删除跳过锁定、右键切换可见
- [x] 拆出 `useCanvasContextMenu`；工作流节点 Group 带 `id` + `name="workflow-node"` 命中
- [x] 落地 `executeElementCommand` 并接入右键菜单、浮动工具条、图层面板锁/显/重命名；**属性栏**变换/形状/文本/箭头/滤镜亦经 `updateElement`，连续编辑合并历史（见 `docs/guides/element-command-system.md`）
- [x] 图层面板：双击重命名、定位（视口居中）、拖拽排序（无搜索筛选时）、选中滚动至行
- [x] `centerViewOnElement` + `reorderRootsByStackOrder`（store）

## 下一批建议任务

- [ ] `CropEditorModal` 全面接入 `cropMath`
- [ ] 拆 `maskBrush` / `useMaskDrawing`
- [ ] Workflow：运行上游 / 运行整图
- [ ] `ProjectJSON` 版本迁移

## 维护向可选（不在原 10 阶段编号内）

- [x] **统一图片编辑**：`ImageEditorModal`（裁剪 / 蒙版 / 解析3D Tab）、`FloatingToolbar` 含 `parse3d`、右键菜单去掉与快捷条重复的裁剪/AI/蒙版（2026-05，见 `docs/AI_CONTEXT.md` §18）
- [x] **深色专业工具 UI**：`themes.css` Token + `pro-tool-ui.css`（2026-05）
- [ ] `image-tools` 内再拆 `cropRenderer` / `maskBrush`（`cropMath` 已拆）
- [x] 更多业务入口改用 `executeElementCommand`（右键、浮动条、图层锁/显/重命名；其余入口渐进）
- [x] `StageCanvas` 小步外移：`useStageKeyboardShortcuts`、`useCanvasDropImport`、`useCanvasContextMenu`

## 改完一段后

1. `npm run build`  
2. 更新 `docs/AI_CONTEXT.md` §18 重构日志（一行即可）  
3. 若阶段状态变：同步本文件与 `docs/AI_CONTEXT.md` §5～6
