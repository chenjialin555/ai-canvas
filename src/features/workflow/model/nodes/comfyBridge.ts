import type { WorkflowNodeDefinition } from "../types";

/** 导入未知 Comfy 节点时的占位，保留原始 type / widgets_values */
export const COMFY_BRIDGE_NODE: WorkflowNodeDefinition = {
  type: "comfy-bridge",
  title: "Comfy 节点",
  description: "从 ComfyUI 工作流导入的节点（占位显示）",
  category: "import",
  inputs: [],
  outputs: [],
  params: [],
  defaultParams: {
    _comfyType: "Unknown",
    _comfyWidgets: [],
    _comfyProperties: {},
    _comfyInputs: [],
    _comfyOutputs: [],
  },
  executor: "none",
  showRunBar: false,
};
