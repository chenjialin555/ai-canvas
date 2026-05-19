# AI Canvas

基于 **React + Konva + Zustand + FastAPI** 的可视化画布编辑器，支持 Web 与 Electron 桌面端。在类 Figma 的无限画布上编辑矢量/位图，并集成 **单步 AI 生图** 与 **画布内 AI 工作流节点**（连线、运行、结果落画布）。

---

## 功能概览

- 多页面无限画布：选择、变换、对齐、组合、图层、小地图
- 图片工具：裁剪、AI 蒙版（inpaint）、等距柱状全景预览
- 单步 AI 生图：文生图 / 图生图 / 局部重绘
- AI 工作流：画布节点 + 端口连线 + 后端 executor 执行
- 工程持久化：localStorage 自动保存 + JSON 导入导出

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19、TypeScript、Vite 6、Konva、Zustand、Immer |
| 桌面 | Electron 34（可选） |
| 后端 | Python 3.10+、FastAPI、uvicorn、httpx、阿里云 OSS |
| 工具 | uv（Python 依赖）、npm |

---

## 快速开始

```bash
npm install && uv sync && cp .env.example .env
./start-web.sh    # 或 npm run dev
```

浏览器打开 **http://127.0.0.1:5173**。逐步说明、验证清单、常用命令见 [**docs/guides/getting-started.md**](docs/guides/getting-started.md)。  
Web / 桌面 / 打包对照见 [**docs/guides/desktop-and-web-startup.md**](docs/guides/desktop-and-web-startup.md)。

---

## 项目结构

以下为**当前** `src/` 布局（`app` + `features` + `shared`）。细节、数据流与演进说明见 [**docs/工程架构与源码索引.md**](docs/工程架构与源码索引.md)。

```text
src/
├── main.tsx                 # 入口：主题、平台、挂载 App
├── app/                     # 组装：App、shell/*、hooks/*
├── features/
│   ├── editor/              # Zustand、命令、持久化、工程导出
│   ├── canvas/              # Konva 画布、元素、交互、StageCanvas / MiniMap / Toolbar
│   ├── workflow/            # 工作流模型、节点 UI、store slice、API、执行服务
│   ├── ai-generation/       # 单步生图（Modal、API、payload、错误归一）
│   ├── image-tools/         # 裁剪 / 蒙版 / 全景
│   ├── library/             # 素材库面板
│   ├── ai-chat/             # AI 对话侧栏
│   └── settings/            # 外观与快捷工具条设置
├── shared/
│   ├── api/                 # fetch 封装（client、aiClient）
│   ├── platform/            # Web / Electron API Base
│   ├── ui/                  # 通用 UI（如 ContextMenu）
│   ├── lib/                 # 主题、布局、工具函数
│   ├── hooks/               # 跨模块 hooks
│   └── types/               # 全局类型补充
└── styles/                  # 全局 CSS

backend/app/                 # FastAPI：providers、executors、OSS
docs/                        # 维护手册、指南
```

---

## 配置

复制 [`.env.example`](.env.example) 为 `.env`（端口、模型 Key、OSS 等）。变量定义以 `.env.example` 与 `backend/app/core/settings.py` 为准。

---



---

## 架构示意

```text
┌──────────────┐     /api/*      ┌──────────────┐
│ React + Konva│ ──────────────► │   FastAPI    │
│ Zustand Store│                 │ providers    │
└──────────────┘                 │ executors    │
       │                         │ OSS          │
       ▼                         └──────┬───────┘
 localStorage / JSON                    │
                                         ▼
                                  模型网关 / OSS
```

---

## License

Private project — 见仓库策略。
