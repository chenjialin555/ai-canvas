# 归档代码（不参与构建）

重构后**当前主路径未引用**的模块，从 `src/` 移到此目录保留备查，**不删除**。

- 本目录已在 `tsconfig.app.json` 中 **exclude**，不会参与 `tsc` / Vite 打包。
- 若要恢复某文件：移回原路径、修正 import，并从 exclude 中确认无冲突后跑 `npm run build`。

## 归档清单（2026-05-15）

| 原路径 | 说明 |
|--------|------|
| `ai/workflow/services/workflowValidator.ts` | 工作流校验占位（`export {}`） |
| `components/workflow/WorkflowCanvas.tsx` | 独立工作流 Stage；主画布已用 `StageCanvas` + `Page.aiNodes` |
| `editor/commands/elementCommands.ts` | 对手势历史的再导出，无引用 |
| `editor/commands/executeCommand.ts` | `executeElementCommand` 单入口，尚未接入调用方 |
| `editor/commands/pageCommands.ts` | 页面命令占位 |
| `editor/commands/workflowCommands.ts` | 工作流命令占位 |
| `workflow/nodes/imageInput.ts` | 旧 `image-input` 节点定义；未进 registry，迁移逻辑在 `workflow/utils/unifiedGraph.ts` |
| `workflow/nodes/maskInput.ts` | 旧 `mask-input` 节点定义；同上 |

**仍在用的相关代码（勿动）**：`editor/commands/interactionGestureHistory.ts`、`editor/commands/types.ts`；`unifiedGraph` 内对 `image-input` / `mask-input` **类型字符串**的迁移分支。
