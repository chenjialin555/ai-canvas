import type { WorkflowNodeDefinition } from "../types";

export const OUTPAINT_NODE: WorkflowNodeDefinition = {
  type: "outpaint",
  title: "智能扩图",
  description: "向外扩展画面内容（占位：当前返回原图）",
  category: "image-edit",
  inputs: [
    {
      id: "image",
      name: "image",
      label: "原图",
      dataType: "image",
      direction: "input",
      required: true,
    },
  ],
  outputs: [
    {
      id: "result",
      name: "result",
      label: "结果图",
      dataType: "image",
      direction: "output",
    },
  ],
  params: [
    {
      id: "prompt",
      name: "prompt",
      label: "扩图描述",
      type: "textarea",
      defaultValue: "",
    },
  ],
  defaultParams: { prompt: "" },
  preview: {
    enabled: true,
    outputKey: "result",
    type: "image",
  },
  executor: "outpaint",
};
