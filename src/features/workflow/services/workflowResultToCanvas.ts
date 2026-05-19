import type { CanvasElement } from "../../../features/editor/types";
import { getImageDefaults } from "../../../features/editor/store/helpers/imageDefaults";
import { loadImageFrameSize } from "../../../shared/lib/aiImageLayout";
import { nanoid } from "nanoid";
import type { WorkflowNode } from "../model/types";

/**
 * 将节点图像类输出落到画布（外框按输出图原始比例，不再固定 520×320）。
 */
export async function sendWorkflowImageResultToCanvas(options: {
  node: WorkflowNode | undefined;
  outputKey: string;
  addElement: (el: CanvasElement) => void;
}): Promise<void> {
  const { node, outputKey, addElement } = options;
  if (!node) return;
  const out = node.outputs[outputKey];
  if (!out || out.type !== "image" || !("url" in out)) return;
  const url = out.url;
  const frame = await loadImageFrameSize(String(url));

  addElement({
    id: nanoid(),
    type: "image",
    name: "工作流输出",
    x: (node?.x ?? 0) + (node?.width ?? 280) + 40,
    y: node?.y ?? 200,
    width: frame.width,
    height: frame.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    src: String(url),
    ...getImageDefaults(),
  } as CanvasElement);
}
