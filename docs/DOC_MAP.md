# 文档地图（去重说明）

> **原则**：同一主题只在一处**完整**维护，其它文档只保留摘要 + 链接。  
> 发现重复时，以本表「唯一来源」列为准。

---

## 1. 主题 → 唯一来源

| 主题 | 唯一来源 | 其它文档怎么处理 |
|------|----------|------------------|
| 5 分钟了解项目 | [`README.md`](../README.md) | 只保留概览，不展开细节 |
| 安装、启动、首次验证 | [`guides/getting-started.md`](guides/getting-started.md) | README / MAINTENANCE 只链过来 |
| Web / 桌面 / 打包 / 脚本对照 | [`guides/desktop-and-web-startup.md`](guides/desktop-and-web-startup.md) | getting-started 不重复打包表 |
| 环境变量完整列表 | [`.env.example`](../.env.example) + [`backend/app/core/settings.py`](../backend/app/core/settings.py) | 其它文档只列常用项 |
| 日常改代码、概念、数据流示例 | [`MAINTENANCE_GUIDE.md`](MAINTENANCE_GUIDE.md) | 不写目录全表、不写 env 全表 |
| AI / 交接用压缩事实 | [`AI_CONTEXT.md`](AI_CONTEXT.md) | 目录树链到 ARCHITECTURE；不写长教程 |
| 阶段完成状态 | [`ROADMAP.md`](ROADMAP.md) | AI_CONTEXT 只摘要 |
| 数据模型、坐标、OSS、文件全表 | [`doc/PROJECT_ARCHITECTURE.md`](../doc/PROJECT_ARCHITECTURE.md) | **不在** MAINTENANCE / AI_CONTEXT 复制大段 |
| **每个 `src/`、`backend/` 源文件：路径、行数、一句话职责** | 同上文档 **[§18 前端源码文件全表](../doc/PROJECT_ARCHITECTURE.md#18-前端源码文件全表)**、**[§19 后端 Python 源码文件全表](../doc/PROJECT_ARCHITECTURE.md#19-后端-python-源码文件全表)**；目录树导读见 **[§3](../doc/PROJECT_ARCHITECTURE.md#3-仓库目录结构)** | README / 新生课程只链到本节，**不**另维护第二份全表 |
| **HTML/CSS/JS 基础 → React + 本仓库导读（课文 1–21）** | [`新生课程介绍/README.md`](新生课程介绍/README.md) | 不复制 ARCHITECTURE 大表；概念冲突以 ARCHITECTURE 为准 |
| 优化 backlog | [`doc/优化方案.md`](../doc/优化方案.md) | ROADMAP 只勾 checklist |
| 测试命令与清单 | [`guides/testing.md`](guides/testing.md) | AI_CONTEXT §16 链过来 |
| 新增元素 / 节点 / Provider | [`guides/add-new-*.md`](guides/) | 各 guide 独立，不写入 MAINTENANCE 正文 |
| 文档索引与维护规范 | [`docs/README.md`](README.md) | doc/README 只做 doc/ 子目录说明 |

---

## 2. 推荐阅读顺序

```text
README.md
  → guides/getting-started.md
  → MAINTENANCE_GUIDE.md
  → guides/desktop-and-web-startup.md（若用桌面版）
  → doc/PROJECT_ARCHITECTURE.md（查契约 / 全表时）
  → 新生课程介绍/README.md（若需按课补 React / 本项目前端链）
  → AI_CONTEXT.md（开 AI 对话时）
```

---

## 3. 已归档 / 勿再维护正文

| 文件 | 状态 | 请改 |
|------|------|------|
| [`doc/项目理解报告.md`](../doc/项目理解报告.md) | 一次性分析报告，与 ARCHITECTURE + AI_CONTEXT 重复 | 只作历史参考 |
| [`doc/文档体系设计.md`](../doc/文档体系设计.md) | 已并入本文 + `docs/README.md` | 只作历史参考 |

---

## 4. 改文档时的规则

1. **先查本表**：新内容应加在「唯一来源」，而不是再写一份。
2. **摘要 + 链接**：非唯一来源的文件最多 5 行摘要，然后 `详见 …`。
3. **禁止整段复制**：尤其目录树、env 表、启动命令表、数据流 mermaid。
4. **同步更新**：改脚本/端口/env → getting-started + `.env.example`；改架构/目录 → PROJECT_ARCHITECTURE + AI_CONTEXT 一行。

---

## 5. doc/ 与 docs/ 分工（一句话）

| 目录 | 一句话 |
|------|--------|
| **docs/** | 会随功能频繁更新的手册、指南、AI 上下文 |
| **doc/** | 长参考（ARCHITECTURE）、规划（优化方案）、模板；少改 |
