# AI Canvas 文档索引

> **去重说明**：同一主题只维护一份正文，见 [**DOC_MAP.md**](DOC_MAP.md)。

---

## 新人第一天

1. [项目 README](../README.md) — 5 分钟概览
2. [快速上手](guides/getting-started.md) — 安装、启动、验证
3. [维护手册](MAINTENANCE_GUIDE.md) — 概念与改代码地图
4. [新生课程介绍](新生课程介绍/README.md) — **会 HTML/CSS/JS、不熟 React / 本仓库**时按课阅读（与 MAINTENANCE 互补，不替代 ARCHITECTURE）
5. [Web / 桌面启动](guides/desktop-and-web-startup.md) — 脚本对照、打包（按需）

---

## 日常开发

| 文档 | 用途 |
|------|------|
| [DOC_MAP.md](DOC_MAP.md) | **主题唯一来源**、避免重复维护 |
| [AI_CONTEXT.md](AI_CONTEXT.md) | 给 AI / 交接的压缩上下文 |
| [MAINTENANCE_GUIDE.md](MAINTENANCE_GUIDE.md) | 概念、数据流、改哪份代码 |
| [ROADMAP.md](ROADMAP.md) | 阶段 checklist |

---

## 操作指南（guides/）

| 指南 | 说明 |
|------|------|
| [getting-started.md](guides/getting-started.md) | 环境、启动、验证 |
| [desktop-and-web-startup.md](guides/desktop-and-web-startup.md) | Web、桌面、打包 |
| [testing.md](guides/testing.md) | 测试命令与清单 |
| [add-new-element-type.md](guides/add-new-element-type.md) | 新增画布元素 |
| [add-new-workflow-node.md](guides/add-new-workflow-node.md) | 新增工作流节点 |
| [add-new-ai-provider.md](guides/add-new-ai-provider.md) | 新增 Provider |
| [element-command-system.md](guides/element-command-system.md) | 元素命令与 undo |
| [debug-canvas-coordinates.md](guides/debug-canvas-coordinates.md) | 坐标调试 |
| [canvas-performance.md](guides/canvas-performance.md) | 画布性能 |

---

## 深度参考（doc/）

| 文档 | 用途 |
|------|------|
| [PROJECT_ARCHITECTURE.md](../doc/PROJECT_ARCHITECTURE.md) | 数据模型、坐标、OSS；**§3 目录导读**；**§18 / §19 前后端每个源文件的行数与职责（找「这个文件干嘛」首选）** |
| [优化方案.md](../doc/优化方案.md) | 优化 backlog |

`doc/项目理解报告.md`、`doc/文档体系设计.md` 已归档，见 [DOC_MAP.md §3](DOC_MAP.md#3-已归档--勿再维护正文)。

---

## 选修（培训）

- [新生学习思路.md](新生学习思路.md)
- [新生课程介绍/](新生课程介绍/)

---

## 文档维护（简要）

| 变更类型 | 更新 |
|----------|------|
| 脚本 / 端口 | `getting-started.md`、`.env.example` |
| 环境变量 | `.env.example`、`PROJECT_ARCHITECTURE` §11 |
| 架构 / 目录 | `PROJECT_ARCHITECTURE`、`AI_CONTEXT` 一行日志 |
| 新功能 how-to | 对应 `guides/*.md` |

细则见 [DOC_MAP.md §4](DOC_MAP.md#4-改文档时的规则)。
