import type { WorkflowNodeDefinition } from "../types";

export const INPAINT_NODE: WorkflowNodeDefinition = {
  type: "inpaint",
  title: "局部重绘",
  description: "根据蒙版区域对原图局部编辑",
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
    {
      id: "mask",
      name: "mask",
      label: "蒙版",
      dataType: "mask",
      direction: "input",
      required: true,
    },
  ],
  outputs: [
    {
      id: "result",
      name: "result",
      label: "图像",
      dataType: "image",
      direction: "output",
    },
  ],
  params: [
    {
      id: "prompt",
      name: "prompt",
      label: "重绘描述",
      type: "textarea",
      defaultValue: "",
      required: true,
    },
    {
      id: "provider",
      name: "provider",
      label: "提供方",
      type: "select",
      defaultValue: "doubao",
      options: [
        { label: "豆包", value: "doubao" },
        { label: "Banana", value: "banana" },
        { label: "通义 Qwen", value: "qwen" },
      ],
    },
    {
      id: "model",
      name: "model",
      label: "模型",
      type: "select",
      defaultValue: "doubao-seededit-3-0-i2i-250628",
      options: [
        { label: "Doubao SeedEdit", value: "doubao-seededit-3-0-i2i-250628" },
        { label: "Qwen Image Edit Max", value: "qwen-image-edit-max" },
        { label: "nano-banana-2-2k", value: "nano-banana-2-2k" },
      ],
    },
    {
      id: "guidanceScale",
      name: "guidanceScale",
      label: "引导强度",
      type: "slider",
      defaultValue: 5.5,
      min: 1,
      max: 10,
      step: 0.1,
    },
  ],
  defaultParams: {
    prompt: "",
    provider: "doubao",
    model: "doubao-seededit-3-0-i2i-250628",
    guidanceScale: 5.5,
  },
  preview: {
    enabled: true,
    outputKey: "result",
    type: "image",
  },
  executor: "inpaint",
};
