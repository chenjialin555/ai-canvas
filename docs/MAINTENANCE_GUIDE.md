# AI Canvas — 学习与维护手册

> **读者**：需要亲自改代码、查问题、加功能的你。  
> **风格**：白话 + 步骤；不替代 `doc/PROJECT_ARCHITECTURE.md` 的细表。  
> **给 AI 的短上下文**：请优先读 `docs/AI_CONTEXT.md`。

---

## 1. 这个项目是做什么的？

可以把它想成 **浏览器里的简易「无限画布」编辑器**（有点像 Figma 的壳子），但多了两块能力：

1. **单步 AI 生图**：弹窗或侧栏里填参数，一键出图到画布或替换选中图。  
2. **画布内 AI 工作流**：在画布上放「节点」、连线，点运行，让后端按节点类型处理。

---

## 2. 如何启动项目？

**推荐（脚本会检查依赖）**

```bash
./start-dev.sh
```

**或手动**

```bash
npm install          # 前端依赖
uv sync              # Python 虚拟环境与后端依赖（若尚未建 .venv）
npm run dev          # 同时起 Vite + uvicorn（见 package.json）
```

**默认地址（未改端口时）**

- 前端：Vite 开发服务器（常见为 `http://localhost:5173`，以终端输出为准）。  
- 后端：`http://localhost:13555`（可用环境变量 `API_PORT` 改，见 `start-dev.sh` / `vite.config.ts`）。  
- 浏览器里请求 **`/api/...`** 会由 Vite **代理**到上述后端端口。

---

## 3. 前端和后端分别负责什么？

| 层次 | 负责 |
|------|------|
| **前端** | 界面、Konva 画布、选中与编辑、工程状态（Zustand）、调 API、展示错误与 loading |
| **后端** | 校验请求、调 OSS、调各家模型 API、工作流 executor、返回 URL / JSON |

---

## 4. 建议先理解的 10 个概念

1. **Page**：一页画布，里面有普通元素、AI 节点、边等。  
2. **Element（CanvasElement）**：矩形、文字、图片、箭头、组合。  
3. **ImageElement**：带裁剪、滤镜、可选 AI 蒙版等字段的图片。  
4. **WorkflowNode**：画布上的 AI 功能块（`aiNodes`）。  
5. **Edge**：谁连到谁（端口之间）。  
6. **Store（Zustand）**：前端的「真相源」——当前打开的工程、选中、缩放平移等。  
7. **Konva Stage / Layer**：真正画图的一层；React 用 `react-konva` 包了一层。  
8. **世界坐标**：存在 store 里的 `x, y`——和缩放、平移无关的逻辑位置。  
9. **屏幕坐标**：鼠标在窗口里的位置；浮动 HTML 往往要换算。  
10. **Provider / Executor**：后端里，前者偏「单步生图厂商」，后者偏「工作流某一类节点怎么跑」。

---

## 5. 前端整体结构怎么读？（找代码地图）

| 我想… | 先看 |
|--------|------|
| 改画布主流程、滚轮、空格、拖图进画布 | `src/components/StageCanvas.tsx`、`src/canvas/hooks/*` |
| 改某一种元素的显示/拖拽 | `src/canvas/elements/`、`commonProps.ts` |
| 改全局状态、保存、页面 | `src/editor/store/`、`editor/types.ts` |
| 改顶栏、侧栏、弹窗挂载 | `src/app/` |
| 改单步生图表单或请求前后逻辑 | `src/ai/generation/` |
| 改工作流节点外观、端口 | `src/components/workflow/WorkflowNodeView.tsx`、`src/workflow/` |
| 改工作流运行、报错、写回节点 | `src/editor/store/slices/workflowSlice.ts`、`src/ai/workflow/` |
| 改裁剪 / 蒙版编辑器 | `src/image-tools/` |
| 改后端接口或模型 | `backend/app/` |

---

## 6. 一次用户操作是怎么走的？（三个例子）

### 拖动一张图片

用户拖 Konva 节点 → `onDragEnd` → `updateElement(id, { x, y }, { history: false })`（具体在 `canvas/elements/commonProps.ts` 等）→ Store 更新 `pages` → 组件重绘 → 防抖写入 localStorage（见 persistence）。

### 单步 AI 生图

用户在 `AiGenerateModal` 填表 → 点生成 → `generationService` 组请求 → `POST /api/generate-image` → 后端返回图 URL → 前端 `addElement` 或 `replaceImageKeepFrame` → 画布更新。

### 运行一个工作流节点

点击运行 → `workflowSlice` 收集上游、序列化 →（若需后端）`workflowRunner` → `POST /api/workflow/run-node` → 把 `outputs` 写回节点 → UI 预览更新；可选「发送到画布」走 `workflowResultToCanvas`。

---

## 7. 画布（Canvas）怎么理解？

- **一个大 Stage**：缩放 `zoom`、平移 `pan` 在 store 里，和 Konva `Stage` 的 `scale` / `position` 对齐；滚轮/拖画布时优先直接改 Konva，再防抖写回 store（见性能文档）。  
- **几层 Layer**：`CanvasBackgroundLayer`（网格 + 边）、`CanvasPageContent`（元素 + AI 节点）、`CanvasInteractionLayer`（框选 / Transformer / 临时连线）；对齐线见 `AlignmentGuides` + `guidesRuntime`。  
- **两类东西叠在一起**：普通 **elements** 和 **aiNodes**（外加连线）。

- 坐标换算：`docs/guides/debug-canvas-coordinates.md`  
- **性能优化说明（拖动画布为何更丝滑）**：`docs/guides/canvas-performance.md`

---

## 8. Store 怎么理解？

- 打开浏览器开发工具 Application → LocalStorage，可看到项目键（见 store 常量）。  
- **重要状态**（页、选中、zoom/pan、工作流）应进 Store；纯 Modal 内临时 UI 可用 `useState`。  
- **撤销**：当前仍是「整包快照」；拖拽/缩放一次手势只会打 **一条** 相关历史（见 `interactionGestureHistory`）。

---

## 9. AI 生图怎么理解？（两条线）

| 路径 | 典型入口 | 说明 |
|------|----------|------|
| 单步 | `AiGenerateModal`、`AiChatPanel` | 走 `/api/generate-image`，与弹窗表单字段对应 |
| 工作流 | 节点上的运行、边上传的数据 | 走 `/api/workflow/run-node`，按节点类型路由 executor |

**短期不必强行合成一条**；要统一属于长期阶段 10，需单独设计。

---

## 10. Workflow 节点怎么理解？

把节点想成 **积木块**：左边/上边是 **输入口**，右边/下边是 **输出口**，用 **边** 把上游输出接到下游输入。  
「运行」时：前端把上游算好的图/蒙版等塞进请求体，后端 **executor** 按 `nodeType` 处理，再把结果写回节点的 `outputs`。

新增一类节点：按 `docs/guides/add-new-workflow-node.md` 做。

---

## 11. 保存和加载怎么理解？

- 工程整体是一个 **ProjectJSON**（结构见 `editor/types.ts`）。  
- **顶栏**有保存 JSON / 加载 JSON；另有自动持久化到 localStorage。  
- **大图**：长期存 dataURL 会让 localStorage 爆；生产环境更稳妥的是 **URL + OSS**（后端已管上传时）。

---

## 12. 我想改功能，应该去哪？（速查）

已在第 5 节表格列出；再补三条高频：

- **右键菜单**：`ContextMenu` + `app/App.tsx` 里传入的回调。  
- **浮动工具条**：`FloatingToolbar.tsx`。  
- **快捷键（撤销、全选、空格等）**：主要在 `StageCanvas` 的 `useEffect`（与画布强相关）。

---

## 13. 常见问题排查

| 现象 | 可检查 |
|------|--------|
| 点击/命中偏移 | `debug-canvas-coordinates.md`；是否混用 client 与 Stage 坐标 |
| 导出图空白 | 图片跨域 CORS；`export.ts` 里相关分支 |
| localStorage 写爆 | 是否把超大 base64 塞进工程 JSON |
| AI 一直失败 | 浏览器 Network、`API_PORT`、后端日志、密钥与 OSS |
| 工作流节点无输出 | 边是否连对、`runPayload`、executor 是否注册、节点 `executor` 字段 |

---

## 14. 新增功能操作指南（链到细文档）

- [新增画布元素类型](guides/add-new-element-type.md)  
- [新增工作流节点](guides/add-new-workflow-node.md)  
- [新增 AI Provider](guides/add-new-ai-provider.md)  
- [调试画布坐标](guides/debug-canvas-coordinates.md)  

---

## 15. 后续路线图（与仓库 checklist 对齐）

详见 **`docs/ROADMAP.md`**（短清单）与 **`doc/阶段性修改计划.md`**（带完成记录）。

**当前**：阶段 1～9 已完成；阶段 10（统一两套 AI）为 **长期 backlog**，未在代码里实现。

---

## 16. 和「给 AI 的文档」怎么配合用？

- 新开 AI 对话：先发 **`docs/AI_CONTEXT.md`**（必要时附 `docs/ROADMAP.md`）。  
- 你自己日常：**本手册** + `PROJECT_ARCHITECTURE` 当词典查。
