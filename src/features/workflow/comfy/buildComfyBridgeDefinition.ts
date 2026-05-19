import { COMFY_BRIDGE_NODE } from "../model/nodes/comfyBridge";
import type {
  WorkflowDataType,
  WorkflowNode,
  WorkflowNodeDefinition,
  WorkflowPortDefinition,
} from "../model/types";

function comfySlotTypeToDataType(t: string): WorkflowDataType {
  const u = t.toUpperCase();
  if (u === "IMAGE") return "image";
  if (u === "MASK") return "mask";
  if (u === "STRING") return "text";
  if (u === "INT" || u === "FLOAT") return "number";
  if (u === "BOOLEAN") return "boolean";
  return "json";
}

export function buildComfyBridgeDefinition(
  node: WorkflowNode,
): WorkflowNodeDefinition {
  const rawIn = node.params._comfyInputs;
  const rawOut = node.params._comfyOutputs;
  const comfyType = String(node.params._comfyType ?? "Comfy");

  const inputs: WorkflowPortDefinition[] = Array.isArray(rawIn)
    ? rawIn.map((inp: { name?: string; type?: string }, i: number) => ({
        id: `in_${i}`,
        name: inp.name ?? `input_${i}`,
        label: inp.name ?? `输入 ${i + 1}`,
        dataType: comfySlotTypeToDataType(String(inp.type ?? "*")),
        direction: "input" as const,
      }))
    : [];

  const outputs: WorkflowPortDefinition[] = Array.isArray(rawOut)
    ? rawOut.map((out: { name?: string; type?: string }, i: number) => ({
        id: `out_${i}`,
        name: out.name ?? `output_${i}`,
        label: out.name ?? `输出 ${i + 1}`,
        dataType: comfySlotTypeToDataType(String(out.type ?? "*")),
        direction: "output" as const,
      }))
    : [];

  return {
    ...COMFY_BRIDGE_NODE,
    title: comfyType,
    inputs,
    outputs,
  };
}
