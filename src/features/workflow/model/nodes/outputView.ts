import type { WorkflowNodeDefinition } from "../types";

/**
 * 浏览并保存上游节点的图像输出：不调用远端模型，仅把连线上的图像同步到本节点 outputs。
 * 通过「同步上游预览」刷新；支持下载、新窗口打开、发送到画布（与通用图像输出一致）。
 */
export const OUTPUT_VIEW_NODE: WorkflowNodeDefinition = {
  type: "output-view",
  title: "输出浏览保存",
  description: "连接上游「图像」输出，预览、下载或发送到画布",
  category: "utility",
  inputs: [
    {
      id: "source",
      name: "source",
      label: "上游图像",
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
      order: 0,
    },
  ],
  params: [],
  defaultParams: {},
  preview: {
    enabled: true,
    outputKey: "result",
    type: "image",
  },
  executor: "none",
  showRunBar: true,
};
