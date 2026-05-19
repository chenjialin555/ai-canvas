import type { WorkflowNodeDefinition } from "../types";

export const UPSCALE_NODE: WorkflowNodeDefinition = {
  type: "upscale",
  title: "高清放大",
  description: "提升图像分辨率与细节（占位：当前返回原图）",
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
      id: "scale",
      name: "scale",
      label: "放大倍数",
      type: "select",
      defaultValue: "2",
      options: [
        { label: "2×", value: "2" },
        { label: "4×", value: "4" },
      ],
    },
  ],
  defaultParams: { scale: "2" },
  preview: {
    enabled: true,
    outputKey: "result",
    type: "image",
  },
  executor: "upscale",
};
