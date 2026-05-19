import type { WorkflowNodeDefinition } from "../../../features/workflow/model/types";

export const IMAGE_INPUT_NODE: WorkflowNodeDefinition = {
  type: "image-input",
  title: "图片输入",
  description: "引用画布上的图片作为工作流输出",
  category: "input",
  inputs: [],
  outputs: [
    {
      id: "image",
      name: "image",
      label: "图片",
      dataType: "image",
      direction: "output",
      order: 0,
    },
  ],
  params: [],
  defaultParams: {},
  preview: {
    enabled: true,
    outputKey: "image",
    type: "image",
  },
  executor: "none",
};
