import type { CanvasElement } from "../../../editor/types";
import { makeImage } from "../../../editor/store/helpers/imageDefaults";
import type { WorkflowNode } from "../../../workflow/types";

/**
 * 将节点图像类输出落到画布（与原先 `sendWorkflowResultToCanvas` 一致）。
 */
export function sendWorkflowImageResultToCanvas(options: {
  node: WorkflowNode | undefined;
  outputKey: string;
  addElement: (el: CanvasElement) => void;
}): void {
  const { node, outputKey, addElement } = options;
  if (!node) return;
  const out = node.outputs[outputKey];
  if (!out || out.type !== "image" || !("url" in out)) return;
  const url = out.url;
  addElement({
    ...makeImage(String(url), "工作流输出"),
    x: (node?.x ?? 0) + (node?.width ?? 280) + 40,
    y: node?.y ?? 200,
  } as CanvasElement);
}
