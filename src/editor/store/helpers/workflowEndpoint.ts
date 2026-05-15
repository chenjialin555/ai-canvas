import type { NodeEndpoint } from "../../../workflow/types";

export function endpointKey(e: NodeEndpoint): string {
  if (e.kind === "image-element") {
    return `img:${e.elementId}:${e.portId}`;
  }
  return `ai:${e.nodeId}:${e.portId}`;
}
