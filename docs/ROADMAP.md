# AI Canvas — 重构与维护路线图（简表）

> 与 `doc/阶段性修改计划.md` 同步；**已完成**项在此勾选，便于扫一眼。  
> 详细背景与约束见 **`docs/AI_CONTEXT.md`**。

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

## 维护向可选（不在原 10 阶段编号内）

- [ ] `image-tools` 内再拆 `cropMath` / `cropRenderer` / `maskBrush`
- [ ] 更多业务入口改用 `executeElementCommand`
- [ ] `StageCanvas` 继续小步外移（键盘、拖放等）

## 改完一段后

1. `npm run build`  
2. 更新 `docs/AI_CONTEXT.md` §18 重构日志（一行即可）  
3. 若阶段状态变：同步本文件与 `doc/阶段性修改计划.md` checklist
