# Web 版 / 桌面版 / 后端 — 启动与打包说明

> **读者**：日常使用、已安装桌面客户端、或需要打 Windows `.exe` 的同学。  
> **源码架构**：见 `doc/PROJECT_ARCHITECTURE.md`；开发维护见 `docs/MAINTENANCE_GUIDE.md`。

---

## 1. 先搞清楚三件事

| 组件 | 是什么 | 是否随安装包自带 |
|------|--------|----------------|
| **前端编辑器** | React + Konva，同一套代码 | Web：浏览器访问；桌面：Electron 壳 |
| **后端 FastAPI** | 生图、工作流、OSS 等 API | **否**，需在本机或服务器单独启动 |
| **Vite 开发服务器** | 仅开发 / 网页版用 | 桌面安装包**不需要** |

关系示意：

```text
                    ┌─────────────────┐
                    │  FastAPI 后端    │  ← 默认 http://127.0.0.1:13555
                    │  (需单独启动)    │
                    └────────▲────────┘
                             │ /api/...
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────┴────────┐         ┌─────────┴─────────┐
     │  浏览器 Web 版   │         │  已安装的桌面客户端 │
     │  Vite :5173     │         │  .exe / AppImage   │
     └─────────────────┘         └───────────────────┘
```

**桌面安装包里没有后端。** 使用前请先在本机（或配置的远程地址）把 API 跑起来。

---

## 2. 我该用哪个启动脚本？

项目根目录提供四个脚本（Linux / macOS 用 `./xxx.sh`；Windows 可在 Git Bash / WSL 里同样执行，或改用下表中的 `npm run` 等价命令）。

| 脚本 | 启动内容 | 适用场景 |
|------|----------|----------|
| **`./start-backend.sh`** | 仅后端 uvicorn | **已安装桌面客户端**：先跑这个，再自己双击打开客户端 |
| **`./start-web.sh`** | 后端 + Vite（热更新） | **浏览器网页版**：再打开 `http://127.0.0.1:5173` |
| **`./start-dev.sh`** | 后端 + Vite（无热更新） | 网页调试，改代码需重启脚本并刷新浏览器 |
| **`./start-dev-desktop.sh`** | 后端 + Vite + **开发用** Electron | **从源码**调桌面壳，**不是**已安装的 `.exe` |

### 2.1 已安装桌面客户端（推荐流程）

1. 进入**源码仓库目录**（需要 `.env`、`uv`、Python 环境来起后端）：

   ```bash
   cd /path/to/ai-canvas
   ./start-backend.sh
   ```

2. 保持终端不关，**手动打开**开始菜单 / 桌面上的 **AI Canvas**（或 zip 解压后的 `AI Canvas.exe`）。

3. 客户端默认请求 **`http://127.0.0.1:13555`**，与 `.env` 里 `API_PORT=13555` 一致即可。

> **不要**对已安装客户端使用 `./start-dev-desktop.sh`：它会再起 Vite 和开发版 Electron，和安装包是两套东西。

### 2.2 浏览器网页版

```bash
./start-web.sh
```

浏览器访问：**http://127.0.0.1:5173**  
前端 `/api/*` 由 Vite 代理到后端（见 `vite.config.ts`）。

### 2.3 从源码开发桌面壳

```bash
./start-dev-desktop.sh
```

等价于 `npm run dev:desktop+api`：后端 + Vite + Electron 开发窗口（加载 `http://127.0.0.1:5173`）。

---

## 3. npm 命令对照

| npm 命令 | 说明 |
|----------|------|
| `npm run dev` | 网页版：Vite + 后端（同 `start-web.sh`） |
| `npm run dev:api` | 仅后端（同 `start-backend.sh` 核心） |
| `npm run dev:desktop+api` | 后端 + Vite + Electron 开发（同 `start-dev-desktop.sh`） |
| `npm run dev:no-reload` | 网页版无热更新（同 `start-dev.sh`） |

首次使用请先：

```bash
npm install
uv sync
cp .env.example .env   # 按需填写 API Key、OSS、API_PORT 等
```

---

## 4. 桌面客户端如何连后端

### 4.1 默认（本机开发）

- 桌面端通过 `electron/preload.cjs` 注入 `window.desktopAPI.getApiBaseUrl()`。
- 未配置时默认：**`http://127.0.0.1:13555`**。
- 与 `.env` 中 **`API_PORT`** 保持一致；改端口后需重启后端，桌面端若仍写死 13555 则需重打包或设环境变量（见下）。

### 4.2 自定义 API 地址

| 方式 | 变量 | 说明 |
|------|------|------|
| 打包前 / 构建时 | `VITE_API_BASE_URL` | 写入前端构建（见 `.env.example`） |
| 启动 Electron / 安装版前 | `AI_CANVAS_API_BASE_URL` | preload 进程读取，例如连云端 `https://api.example.com` |

Windows 示例（CMD，路径按实际安装位置改）：

```bat
set AI_CANVAS_API_BASE_URL=http://127.0.0.1:13555
"C:\Program Files\AI Canvas\AI Canvas.exe"
```

### 4.3 CORS（桌面安装版）

打包应用从 `file://` 加载时，浏览器跨域请求的 `Origin` 可能为字符串 **`null`**。  
后端默认 `cors_origins` 已包含 `"null"`（见 `backend/app/core/settings.py`）。若仍报 CORS，检查是否用了旧版后端或未重启 uvicorn。

---

## 5. 打包桌面客户端

安装包**只含前端 + Electron**，不含 Python 后端。

| 命令 | 产物 | 说明 |
|------|------|------|
| `npm run build:desktop` | 当前系统格式 | Linux 多为 AppImage |
| `npm run build:desktop:win` | NSIS **`.exe` 安装包** | 建议在 **Windows** 上执行 |
| `npm run build:desktop:win:zip` | **`.zip`**（内含 `AI Canvas.exe`） | Linux 上可交叉打包，无需 Wine |
| `npm run build:desktop:win:cross` | Windows `.exe` | Linux 需 `sudo apt install nsis` |
| GitHub Actions | `release/*.exe` | 仓库 → Actions → **Desktop Windows (NSIS exe)** → 下载 Artifact |

产物目录：**`release/`**（已在 `.gitignore` 忽略）。

Linux 上打 NSIS 安装包若报 **`wine is required`**：在 Windows 上打包、用 **`build:desktop:win:zip`**，或安装 Wine / 系统 NSIS 后用 `build:desktop:win:cross`。

---

## 6. 常见问题

### 桌面客户端打开后生图 / 工作流失败

1. 是否已运行 **`./start-backend.sh`**（或等价 `npm run dev:api`）？  
2. 终端里 uvicorn 是否在 **`API_PORT`** 对应端口监听？  
3. `.env` 里模型 Key、OSS 等是否已配置？  
4. 若 API 不在本机 13555，是否设置了 **`AI_CANVAS_API_BASE_URL`**？

### 和 `start-dev-desktop.sh` 搞混了

- **安装版**：`start-backend.sh` + 手动开客户端。  
- **源码开发桌面**：`start-dev-desktop.sh`（会开 Vite + 开发 Electron）。

### 网页版能连上、桌面版连不上

- 网页走 Vite **代理** `/api`；桌面走 **绝对地址** `http://127.0.0.1:13555/api/...`。  
- 确认防火墙未拦本机 13555；确认后端 `API_HOST=0.0.0.0` 或至少监听 127.0.0.1。

### 改代码后桌面安装版没变化

安装包是**打包时刻**的前端快照；改源码后需重新 `npm run build:desktop:*` 并重新安装。开发请用 **`start-dev-desktop.sh`** 或 **`start-web.sh`**。

---

## 7. 快速对照表

| 我想… | 做什么 |
|--------|--------|
| 用已安装的 `.exe`，连本机后端 | `./start-backend.sh` → 打开客户端 |
| 用浏览器 | `./start-web.sh` → 打开 `http://127.0.0.1:5173` |
| 改代码调 Electron | `./start-dev-desktop.sh` |
| 只起后端 | `./start-backend.sh` 或 `npm run dev:api` |
| 打 Windows 安装包 | Windows 上 `npm run build:desktop:win` |
| Linux 上先给 Windows 一个可运行包 | `npm run build:desktop:win:zip`，解压后运行 `AI Canvas.exe` |
