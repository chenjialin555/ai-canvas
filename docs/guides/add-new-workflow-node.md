# 如何新增一个 AI 工作流节点

工作流节点 = **前端定义**（端口、参数 UI、预览）+ **可选后端执行器**（`POST /api/workflow/run-node`）。纯前端节点（如 `output-view`）将 `executor` 设为 `"none"`，由 `workflowSlice` 内分支处理，不走路由执行器。

## 1. 前端：节点定义

1. 在 `src/workflow/types.ts` 中确认 `WorkflowNodeDefinition`、`ParamDef` 等类型满足你要加的字段（一般无需改类型，只填对象）。
2. 在 `src/workflow/nodes/` 下新增 `myNode.ts`（可参考 `src/workflow/nodes/inpaint.ts`）：
   - `type`：全局唯一字符串，与后端 `nodeType` 一致（若需后端）。
   - `inputs` / `outputs`：`id`、`name`、`label`、`dataType`（如 `image`、`mask`）、`direction`、`required`。
   - `params`：表单项定义（`textarea`、`select`、`slider` 等）；`defaultParams` 与之一致。
   - `preview`：可选，控制节点内预览块。
   - `executor`：后端注册名，或 `"none"` 表示纯前端。
3. 在 `src/workflow/nodeRegistry.ts` 的 `WORKFLOW_NODE_REGISTRY` 中注册：`[MY_NODE.type]: MY_NODE`。
4. `createWorkflowNode`（`src/workflow/utils/createNode.ts`）会从 registry 读定义，一般**无需改**；若新节点需要特殊默认宽高，可再扩展 `defaultWorkflowNodeSize`。

## 2. 前端：参数与预览 UI

- `src/components/workflow/WorkflowNodeView.tsx` 根据 `def.params` 渲染控件；若引入**全新** `ParamDef.type`，需在该组件增加对应分支。
- 拖线创建节点时的列表来自 `listCreatableWorkflowNodes`（`nodeRegistry.ts`），依赖 `inputs` 的 `dataType` 匹配。

## 3. 后端：执行器（仅当 `executor !== "none"`）

1. 在 `backend/app/executors/` 下实现类，继承 `BaseNodeExecutor`（见 `backend/app/executors/base.py`），实现 `run(*, inputs, params, trace_id) -> dict`；返回的 dict 即 `outputs`（键与前端 `outputs` 的 `name` 对齐，如 `result`）。
2. 在 `backend/app/executors/registry.py` 的 `ExecutorRegistry._by_node_type` 中注册：`"你的type": YourExecutor()`。
3. `workflow_service.run_node`（`backend/app/services/workflow_service.py`）会按 `req.nodeType` 取执行器；无需改服务，除非你要加横切逻辑。

## 4. 运行与序列化

- 前端运行入口：`workflowSlice` 的 `runWorkflowNode`；远端调用经 `src/ai/workflow/services/workflowRunner.ts` → `postWorkflowRunNode`。
- 上游输入序列化：`src/workflow/utils/runPayload.ts` 与 `unifiedGraph.ts`；若新端口 `dataType` 或键名特殊，检查这两处是否需分支。

## 5. 测试建议

- 画布上创建节点、连线、运行；失败时节点 `error` 文案是否合理。
- `executor === "none"` 的节点：确认 slice 内同步逻辑仍正确。
- 与单步生图共用图片/蒙版时，确认 `image` / `mask` 的 dataURL 或 URL 后端能消费。
