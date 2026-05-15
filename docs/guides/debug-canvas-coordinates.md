# 调试画布坐标问题

本画布使用 Konva `Stage`：`scale`（缩放）、`position`（平移），元素逻辑坐标为**世界坐标**（与 store 中 `element.x/y/width/height` 一致）。以下区分几类坐标，便于对照断点。

## 1. 世界坐标（World）

- 元素在页面里的逻辑位置：`x, y` 以及宽高；不受缩放影响。
- 工作流节点 `WorkflowNode` 的 `x, y` 与元素同属一层逻辑空间。

## 2. Stage 内容坐标（与 pointer 一致的一层）

- `stage.getPointerPosition()`、`getIntersection(pointer)` 使用的坐标是**相对 Stage 容器左上角**的像素坐标（已包含 scale/position 变换后的「内容空间」读数，与 Konva 文档一致）。
- 转换工具：`src/canvas/utils/coordinates.ts`  
  - `screenToWorld(point, { zoom, pan })`  
  - `worldToScreen(point, { zoom, pan })`  
  其中 `zoom` / `pan` 与 store 中视口一致（`Stage` 的 `scaleX` 与 `x/y` position）。

## 3. 视口 / 浏览器坐标（Viewport / Client）

- `MouseEvent.clientX` / `clientY`：相对**浏览器视口**的像素位置。
- `element.getBoundingClientRect()`：某 DOM 节点在视口中的矩形。

典型用法：把「世界 AABB」显示为固定在屏幕上的 HTML（浮动工具条）时，先 `worldToScreen` 得到 Stage 内容坐标，再结合 `stage.container().getBoundingClientRect()` 加上容器偏移，得到 `position: fixed` 可用的 `left/top`。参见 `src/components/FloatingToolbar.tsx`（`worldToStageClient` / `toolbarAnchorViewport`）。

## 4. 右键菜单

- `StageCanvas` 在 `konva-wrap` 上监听 `onContextMenu`：用 `clientX - rect.left` 做命中检测（`getIntersection`），但传给应用的菜单坐标为 **`e.clientX` / `e.clientY`（视口坐标）**，因为 `ContextMenu` 使用 `position: fixed` 且 `left/top` 直接取该值。参见 `src/components/StageCanvas.tsx` 与 `src/components/ContextMenu.tsx`。

## 5. 常见问题

| 现象 | 可能原因 |
|------|----------|
| 点击偏移 | `pointer` 未减 `container.getBoundingClientRect()`；或 `zoom/pan` 与 Stage 实际不同步。 |
| 浮动条错位 | 只算了世界坐标未加容器 offset；或滚动后未更新 `getBoundingClientRect`。 |
| 与世界不符 | 混用了 `clientX` 与 Stage 内坐标；应用 `screenToWorld` 前确认 `point` 定义与工具函数一致。 |

### 5.1 平移与缩放

| 操作 | 效果 |
|------|------|
| **滚轮** | 上下平移画布 |
| **Shift + 滚轮** | 左右平移画布 |
| **Ctrl + 滚轮** | 以指针为锚点缩放 |
| **空格 + 拖动画布** | 平移（`spacePan`）；空白处 **不会** 开始框选 |

实现：`src/canvas/hooks/useImperativeViewport.ts`（`handleWheel`）。松空格或窗口 `blur` 会结束空格平移状态。

## 6. 建议调试步骤

1. 在事件里 `console.log`：`zoom`、`pan`、`stage.scaleX()`、`stage.x()`、`getPointerPosition()`、以及 `screenToWorld` 的结果。
2. 对 HTML 浮层，同时打 `getBoundingClientRect()` 与算出的 `left/top`。
3. 确认修改的是**当前活动页**的元素与 `page` 引用，避免读到旧页数据。
