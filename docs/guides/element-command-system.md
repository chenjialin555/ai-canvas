# 元素命令系统（`executeElementCommand`）

> 与 `src/editor/commands/types.ts`、`executeElementCommand.ts`、store `updateElement` 对齐；历史仍为**快照式** undo/redo，命令层负责统一入口与语义。

## 1. 入口是什么

- **统一入口**：`executeElementCommand(cmd)`（`src/editor/commands/executeElementCommand.ts`）。
- **适用 UI**：右键菜单、浮动工具条、图层面板（锁/显/重命名/排序）、**右侧属性栏**中凡会改元素数据、且应与「锁定 / 多选 / 历史」一致的操作，应优先走命令。
- **不适用**：纯视图（缩放平移）、不写入 `pages[].elements` 的临时 UI 状态。

## 2. 何时用命令里的 `updateElement`，何时直接调 store

| 场景 | 建议 |
|------|------|
| 改 `x/y/width/height/rotation/opacity`、文本、颜色、滤镜等 | `executeElementCommand({ type: "updateElement", id, patch, history })` |
| 已有专用命令（对齐、分布、成组、复制粘贴、置顶等） | 用对应 `type`，不要手写等价 `patch` |
| 内部 slice 组合逻辑（如 `replaceImageFitFrame`、`fitImageFrame`） | 可继续调 store 方法；若以后要统一审计，再包一层命令 |

## 3. 历史记录（`history`）何时提交

- `updateElement` 的 **`history` 默认为 `true`**：每次调用会先 `commitHistory()` 再写入（与 `store.updateElement` 一致）。
- **连续交互**（数字框逐键、滑条拖动、textarea 输入）：应 **`history: false`**，在 **`blur` / `mouseup` / `touchend`** 再调用一次 **`commitHistory()`**，使一次用户操作对应一步 undo。
- **离散操作**（按钮、复选框单次切换、重置滤镜）：可用默认 `history: true`（或显式 `true`）。

## 4. 锁定元素（`locked`）

- Store 中 `updateElement`：若元素已锁定，仅允许补丁键全部为 `locked` / `visible`（便于在图层面板解锁、恢复显示）。
- 其它字段在锁定下会被忽略（不写脏数据）。UI 若需提示，应在面板层判断 `selected.locked`。

## 5. 隐藏元素（`visible`）

- 画布上不渲染、不参与命中与 Transformer；删除等逻辑按 store 现有分支。
- JSON 中保留 `visible: false`；图层面板可通过命令 `toggleVisible` 或 `updateElement` 恢复。

## 6. 多选

- **对齐 / 分布**：`alignSelected` / `distributeSelected`（与多选语义一致）。
- **右侧栏「变换」**：当前仅针对 `selectedIds[0]`；多选时仍以第一个为主，与产品约定一致即可。

## 7. 扩展新命令时

1. 在 `ElementCommand` 联合类型中增加分支。  
2. 在 `executeElementCommand` 的 `switch` 中实现（通常委托 store）。  
3. 在本文档与 `docs/AI_CONTEXT.md` §18 补一行变更说明（可选）。
