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

```text
src/
├── main.tsx           # 入口：主题、平台、挂载 App
├── app/               # 应用壳（顶栏、侧栏、画布区、弹窗）
├── components/        # StageCanvas、工具条、工作流节点视图
├── canvas/            # 画布层、元素、交互 hooks
├── editor/            # 类型、Store、commands、导出
├── ai/                # 单步生图 + 工作流 HTTP
├── workflow/          # 节点定义与注册表
├── image-tools/       # 裁剪 / 蒙版 / 全景编辑器
└── platform/          # Web / Desktop API 地址适配

backend/app/           # FastAPI：providers、executors、OSS
docs/                  # 维护手册、指南、AI 上下文
doc/                   # 架构长文、分析报告
```

---

## 配置

复制 [`.env.example`](.env.example) 为 `.env`（端口、模型 Key、OSS 等）。变量定义以 `.env.example` 与 `backend/app/core/settings.py` 为准。

---

## 文档

完整索引与**去重说明**见 [**docs/README.md**](docs/README.md)、[**docs/DOC_MAP.md**](docs/DOC_MAP.md)。

| 我想… | 阅读 |
|--------|------|
| **React / 前端入门（本仓库课文）** | [`docs/新生课程介绍/README.md`](docs/新生课程介绍/README.md) |
| 安装与启动 | [`docs/guides/getting-started.md`](docs/guides/getting-started.md) |
| 日常改代码 | [`docs/MAINTENANCE_GUIDE.md`](docs/MAINTENANCE_GUIDE.md) |
| 给 AI 上下文 | [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) |
| 查架构、数据流、**每个源文件做什么（全表）** | [`doc/PROJECT_ARCHITECTURE.md`](doc/PROJECT_ARCHITECTURE.md)（重点 [**§3 目录导读**](doc/PROJECT_ARCHITECTURE.md#3-仓库目录结构)、[**§18 前端全表**](doc/PROJECT_ARCHITECTURE.md#18-前端源码文件全表)、[**§19 后端全表**](doc/PROJECT_ARCHITECTURE.md#19-后端-python-源码文件全表)） |

测试与构建见 [`docs/guides/testing.md`](docs/guides/testing.md)。

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
