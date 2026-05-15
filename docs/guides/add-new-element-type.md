# 如何新增一个画布元素类型

面向本仓库当前结构（`CanvasElement` 判别联合、`ElementNode` 分发、Zustand `elementSlice`）。

## 1. 类型与数据模型

在 `src/editor/types.ts` 中：

- 扩展 `ElementType` 字面量联合。
- 新增 `XxxElement` 类型，并把它并入 `CanvasElement`。
- 若有需要持久化到工程 JSON 的字段，一并写进类型（与撤销栈一致）。

## 2. 画布渲染

1. 在 `src/canvas/elements/` 下新增 `XxxElementNode.tsx`（参考 `RectElementNode.tsx`、`ImageElementNode.tsx`）。
2. 在 `src/canvas/elements/ElementNode.tsx` 中增加对应 `element.type` 分支并传入 `setGuides` 等既有 props。

公共逻辑（尽量复用，避免复制粘贴）：

- 吸附对齐：`src/canvas/elements/getSnap.ts`
- 拖拽/变换写回：`src/canvas/elements/commonProps.ts`
- 图片类：`src/canvas/elements/useCanvasImage.ts`

## 3. Store 与默认实例

- `addElement` 定义在 `src/editor/store/slices/elementSlice.ts`：保证传入对象满足新类型的必填字段。
- 若在顶栏等处「一键插入」示例元素，同步修改 `src/app/TopBar.tsx`（或其它调用 `addElement` 的入口）。

## 4. 其它可能触及点（按需搜索）

在仓库内搜索 `element.type ===` / `selected.type`，逐项确认：

- `src/editor/export.ts`：工程导出、裁剪 PNG 等是否依赖类型分支。
- `src/app/RightSidebar.tsx`：属性面板是否需新一节 UI。
- `src/components/FloatingToolbar.tsx`：快捷条是否需新按钮或隐藏规则。
- `src/components/ContextMenu.tsx`：右键菜单项是否与类型绑定。

## 5. 自检

- `npm run build`
- 新建元素、选中、拖拽、缩放、撤销/重做、保存 JSON 再加载。
