# 测试指南

> **现状**：自动化覆盖以构建检查 + 后端冒烟为主；画布交互依赖手动回归。

---

## 1. 前端

### 类型检查与生产构建

```bash
npm run build
```

等价于 `tsc -b && vite build`。这是 **每次改动的最低门槛**。

### 本地预览构建产物

```bash
npm run build:web
npm run preview
```

用于验证生产 base 路径、静态资源加载（Web 部署前）。

### 手动回归清单

改动画布、Store、undo 时建议逐项验证（摘自 `docs/AI_CONTEXT.md` §16）：

- [ ] 画布显示、平移缩放、空格拖画布
- [ ] 选择 / 拖拽 / Transformer；多选变换后 Ctrl+Z 一次恢复
- [ ] 撤销 / 重做
- [ ] 保存或刷新后状态（localStorage）
- [ ] 单步生图（若有密钥）
- [ ] 工作流：建节点、连线、运行、结果落画布
- [ ] JSON 导入导出（若改动相关）

---

## 2. 后端

### 安装测试依赖

```bash
uv sync --extra dev
```

### 运行 pytest

```bash
uv run pytest
```

当前用例（`backend/tests/test_smoke.py`）：

| 测试 | 验证 |
|------|------|
| `test_health` | `GET /api/health` 返回 200 且 `ok: true` |
| `test_models_shape` | `GET /api/models` 结构含 provider 与 models |

### 扩展测试建议

- 新 API 路由：在 `backend/tests/` 增加 TestClient 用例
- 新 provider/executor：mock httpx 或网关响应，避免 CI 依赖真实 Key

---

## 3. 端到端（当前无 E2E 框架）

项目 **未** 集成 Playwright/Cypress。若需 E2E：

1. 评估是否 worth（画布 Konva 测试成本高）
2. 优先通过 `ProjectJSON` fixture + store API 做集成测试
3. 或使用 ADR 记录引入 E2E 的决策（模板见 `doc/templates/ADR.template.md`）

---

## 4. CI 建议（若接入 GitHub Actions）

```yaml
# 示例步骤
- run: npm ci && npm run build
- run: uv sync --extra dev && uv run pytest
```

桌面打包 workflow 见仓库 Actions（若有 **Desktop Windows** 等 job）。

---

## 5. 相关文档

- [`MAINTENANCE_GUIDE.md`](../MAINTENANCE_GUIDE.md) — 常见问题排查
- [`debug-canvas-coordinates.md`](./debug-canvas-coordinates.md) — 坐标类 bug
