# 快速上手（Getting Started）

> **目标**：从零到在浏览器里打开可编辑画布，并确认前后端联通。  
> **下一步**：日常开发读 [`MAINTENANCE_GUIDE.md`](../MAINTENANCE_GUIDE.md)。  
> **桌面 / 打包**：见 [`desktop-and-web-startup.md`](desktop-and-web-startup.md)（本文不重复脚本对照表）。

---

## 1. 克隆与依赖

```bash
git clone <repo-url> ai-canvas
cd ai-canvas

npm install
uv sync
```

| 工具 | 用途 |
|------|------|
| Node.js 18+ | 前端与 Vite |
| uv | Python 虚拟环境与后端依赖（`.venv`） |

---

## 2. 配置环境变量

```bash
cp .env.example .env
```

至少关注：

| 变量 | 说明 |
|------|------|
| `API_PORT` | 后端端口，默认 `13555`（与 Vite 代理一致） |
| `QWEN_API_KEY` 等 | 测试 AI 生图时需要 |
| OSS 相关 | 上传 dataURL 图时需要 |

未配置 Key 时，画布编辑仍可用，生图/工作流会报错。

---

## 3. 启动开发环境

**推荐（热更新）**

```bash
./start-web.sh
# 等价于 npm run dev
```

**或使用脚本（无热更新，改代码需重启）**

```bash
./start-dev.sh
```

打开浏览器：**http://127.0.0.1:5173**

---

## 4. 验证清单

### 4.1 后端

```bash
curl http://127.0.0.1:13555/api/health
# 期望: {"ok": true, ...}
```

### 4.2 前端

- [ ] 画布显示网格
- [ ] 滚轮缩放、空格拖动画布
- [ ] 顶栏可添加矩形/文字/图片
- [ ] Ctrl+Z 撤销可用
- [ ] 刷新后工程仍在（localStorage）

### 4.3 AI（可选，需 .env 密钥）

- [ ] 单步生图弹窗可返回图片
- [ ] 工作流节点运行有 outputs

---

## 5. 仅启动后端

已安装桌面客户端时：

```bash
./start-backend.sh
```

然后手动打开 AI Canvas 桌面应用。详见 [`desktop-and-web-startup.md`](./desktop-and-web-startup.md)。

---

## 6. 构建检查

改代码后最低回归：

```bash
npm run build
uv run pytest
```

---

## 7. 代码入口速查

| 文件 | 作用 |
|------|------|
| `src/main.tsx` | React 挂载、`initPlatform`、`initUiTheme` |
| `src/app/App.tsx` | 应用编排 |
| `src/components/StageCanvas.tsx` | Konva 主画布 |
| `src/editor/store/index.ts` | Zustand Store |
| `backend/app/main.py` | FastAPI 入口 |

---

## 8. 常见问题

排查表见 [`MAINTENANCE_GUIDE.md`](../MAINTENANCE_GUIDE.md) §13；桌面版连不上见 [`desktop-and-web-startup.md`](desktop-and-web-startup.md) §6。
