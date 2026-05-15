import { Line } from "react-konva";
import type { Page } from "../../editor/types";
import type { WorkflowConnectingState } from "../../workflow/types";
import { tempWireFromEndpoint } from "../../workflow/utils/unifiedGraph";

export type TemporaryWorkflowConnectionProps = {
  page: Page;
  workflowConnecting: WorkflowConnectingState;
  zoom: number;
};

export function TemporaryWorkflowConnection({
  page,
  workflowConnecting,
  zoom,
}: TemporaryWorkflowConnectionProps) {
  if (!workflowConnecting.active || !workflowConnecting.from) return null;

  const pts = tempWireFromEndpoint(
    page,
    workflowConnecting.from,
    workflowConnecting.pointerX,
    workflowConnecting.pointerY,
  );

  return (
    <Line
      bezier
      points={pts}
      stroke="#42c4c4"
      strokeWidth={2 / zoom}
      dash={[8 / zoom, 6 / zoom]}
      lineCap="round"
      listening={false}
    />
  );
}
