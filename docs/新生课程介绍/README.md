# 新生课程介绍（React / 本项目导读）

面向：**会写 HTML / CSS / 基础 JavaScript（变量、函数、对象）**，但**没用过 React** 的同学。  
目标：能顺着 **组件 → props → 状态 → 副作用 → 类型 → 全局 store → 画布 → 网络** 读懂 `src/` 里 AI 生成或他人写的代码。

与仓库其它文档的关系：

- **本目录**：按「课」拆开的渐进式中文导读（偏前端心智模型 + 本项目落点）。
- **`doc/PROJECT_ARCHITECTURE.md`**：权威长参考（数据模型、坐标、OSS；**§3** 目录导读；**§18 / §19** 前后端**每个源文件**一行职责说明）。
- **`docs/guides/getting-started.md`**：安装、启动、验证清单。

---

## 建议阅读顺序

| 顺序 | 文件 | 主题 |
|------|------|------|
| 1 | [1.md](./1.md) | React 组件与 JSX |
| 2 | [2.md](./2.md) | Props 与父子传值 |
| 3 | [3.md](./3.md) | `useState` |
| 4 | [4.md](./4.md) | `useEffect` 与 `useRef` |
| 5 | [5.md](./5.md) | TypeScript 最小够用 |
| 6 | [6.md](./6.md) | Zustand 与 `useEditorStore` |
| 7 | [7.md](./7.md) | Konva / react-konva |
| 8 | [8.md](./8.md) | Vite 代理与 `/api` |
| 9 | [9.md](./9.md) | 画布 AI 工作流节点 |
| 10 | [10.md](./10.md) | `ProjectJSON` 与持久化 |
| 11 | [11.md](./11.md) | 单步 AI 生图请求链 |
| 12 | [12.md](./12.md) | `App.tsx` 应用编排（AppShell / modals / EditorModals） |
| 13 | [13.md](./13.md) | `executeElementCommand` 命令入口 |
| 14 | [14.md](./14.md) | `CanvasArea` → `StageCanvas` → `canvas/` 目录地图 |
| 15 | [15.md](./15.md) | `ElementNode` 与 `*ElementNode` 渲染链 |
| 16 | [16.md](./16.md) | `FloatingToolbar`：Portal、屏幕坐标、隐藏条件 |
| 17 | [17.md](./17.md) | `ImageEditorModal` 与裁剪 / 蒙版 / 解析3D |
| 18 | [18.md](./18.md) | `main.tsx`：全局 CSS、主题、平台、`createRoot` |
| 19 | [19.md](./19.md) | `initPlatform` 与 `setApiBaseUrl` / Web 与桌面 |
| 20 | [20.md](./20.md) | `WorkflowNodeView`：Konva 节点卡、端口、运行 |
| 21 | [21.md](./21.md) | `RightSidebar`：属性 / AI 生成 / AI 对话 |

读完第 8 课仍觉得「业务散」时：优先对照 **`doc/PROJECT_ARCHITECTURE.md`** 的目录跳读，再回到具体 `*.ts` / `*.tsx`。第 12–21 课适合在 **能跟读 App、画布、入口与主要侧栏** 时阅读。

---

## 改版说明（优化思路）

- 各课首行 **系列导航** 指向本 README，避免在 1–8 每课重复长篇目录。
- 第 1 课「先不要管」的清单与后续课文 **显式对应**，减少「到底什么时候学」的焦虑。
- 第 8 课补充 **`API_PORT` / 默认后端端口** 与 `vite.config.ts` 一致的说法。
- 第 9–11 课补齐本仓库 **工作流节点、工程 JSON、单步生图** 三条最常见业务链。
- 第 12–21 课补齐 **App、画布链、浮层、入口网络、工作流节点视图与右侧栏**，覆盖主界面大部分区域。
- 课文统一按 **HTML / CSS / 原生 JS** 经验来讲 React，不再用其它框架对照（避免多一套心智负担）。
