import type { WorkflowNodeDefinition } from "../types";

export const MASK_INPUT_NODE: WorkflowNodeDefinition = {
  type: "mask-input",
  title: "蒙版输入",
  description: "引用画布图片的 AI 蒙版",
  category: "input",
  inputs: [],
  outputs: [
    {
      id: "mask",
      name: "mask",
      label: "蒙版",
      dataType: "mask",
      direction: "output",
      order: 0,
    },
  ],
  params: [],
  defaultParams: {},
  preview: {
    enabled: true,
    outputKey: "mask",
    type: "mask",
  },
  executor: "none",
};
