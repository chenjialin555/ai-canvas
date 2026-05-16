import { Line } from "react-konva";
import type { Page } from "../../editor/types";
import type { WorkflowConnectingState } from "../../workflow/types";
import { tempWireFromEndpoint } from "../../workflow/utils/unifiedGraph";

export type TemporaryWorkflowConnectionProps = {
  page: Page;
  workflowConnecting: WorkflowConnectingState;
};

export function TemporaryWorkflowConnection({
  page,
  workflowConnecting,
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
      stroke="#2f7cff"
      strokeWidth={2}
      strokeScaleEnabled={false}
      dash={[8, 6]}
      lineCap="round"
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}
