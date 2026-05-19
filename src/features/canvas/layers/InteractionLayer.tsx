import type { RefObject } from "react";
import { Layer } from "react-konva";
import Konva from "konva";
import type { Page } from "../../editor/types";
import type { WorkflowConnectingState } from "../../workflow/types";
import { AlignmentGuides } from "../interaction/AlignmentGuides";
import { MarqueeSelection } from "../interaction/MarqueeSelection";
import { SelectionTransformer } from "../interaction/SelectionTransformer";
import { TemporaryWorkflowConnection } from "../interaction/TemporaryWorkflowConnection";

export type InteractionLayerProps = {
  selectionVisible: boolean;
  selectionBox: { x: number; y: number; width: number; height: number };
  selectionHasGroup: boolean;
  transformerRef: RefObject<Konva.Transformer | null>;
  workflowConnecting: WorkflowConnectingState;
  page: Page;
};

export function InteractionLayer({
  selectionVisible,
  selectionBox,
  selectionHasGroup,
  transformerRef,
  workflowConnecting,
  page,
}: InteractionLayerProps) {
  return (
    <Layer>
      <AlignmentGuides />
      <MarqueeSelection visible={selectionVisible} box={selectionBox} />
      <SelectionTransformer
        transformerRef={transformerRef}
        selectionHasGroup={selectionHasGroup}
      />
      <TemporaryWorkflowConnection
        page={page}
        workflowConnecting={workflowConnecting}
      />
    </Layer>
  );
}
