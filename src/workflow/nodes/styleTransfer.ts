import type { WorkflowNodeDefinition } from "../types";

export const STYLE_TRANSFER_NODE: WorkflowNodeDefinition = {
  type: "style-transfer",
  title: "风格迁移",
  description: "将风格图迁移到内容图",
  category: "image-edit",
  inputs: [
    {
      id: "contentImage",
      name: "contentImage",
      label: "内容图",
      dataType: "image",
      direction: "input",
      required: true,
    },
    {
      id: "styleImage",
      name: "styleImage",
      label: "风格图",
      dataType: "image",
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
      label: "提示词",
      type: "textarea",
      defaultValue: "保留内容图结构，迁移风格图的视觉风格",
    },
    {
      id: "provider",
      name: "provider",
      label: "提供方",
      type: "select",
      defaultValue: "banana",
      options: [
        { label: "Banana", value: "banana" },
        { label: "Gemini", value: "gemini" },
      ],
    },
    {
      id: "model",
      name: "model",
      label: "模型",
      type: "select",
      defaultValue: "nano-banana-2-2k",
      options: [
        { label: "Nano Banana 2K", value: "nano-banana-2-2k" },
        {
          label: "Gemini 3.1 Preview 2K",
          value: "gemini-3.1-flash-image-preview-2k",
        },
      ],
    },
    {
      id: "strength",
      name: "strength",
      label: "风格强度",
      type: "slider",
      defaultValue: 0.75,
      min: 0,
      max: 1,
      step: 0.01,
    },
  ],
  defaultParams: {
    prompt: "保留内容图结构，迁移风格图的视觉风格",
    provider: "banana",
    model: "nano-banana-2-2k",
    strength: 0.75,
  },
  preview: {
    enabled: true,
    outputKey: "result",
    type: "image",
  },
  executor: "styleTransfer",
};
