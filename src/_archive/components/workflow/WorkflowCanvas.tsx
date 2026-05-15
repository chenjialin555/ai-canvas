import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Layer, Line, Stage } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { getWorkflowNodeDefinition } from "../../workflow/nodeRegistry";
import {
  AI_NODE_INPUT_PORT_CX,
  AI_NODE_OUTPUT_PORT_CX,
  AI_NODE_PORT_GAP,
  AI_NODE_PORT_TOP,
  bezierHorizontalOffset,
} from "../../workflow/nodeLayout";
import { PORT_COLORS } from "../../workflow/portColors";
import type { WorkflowNode } from "../../workflow/types";
import { NodePicker } from "./NodePicker";
import { WorkflowNodeView } from "./WorkflowNodeView";

type Props = {
  width: number;
  height: number;
};

function worldFromClient(
  stage: Konva.Stage,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const scale = stage.scaleX();
  const pos = stage.position();
  const rect = stage.container().getBoundingClientRect();
  const x = (clientX - rect.left - pos.x) / scale;
  const y = (clientY - rect.top - pos.y) / scale;
  return { x, y };
}

function edgeBezierPoints(
  from: WorkflowNode,
  fromPortId: string,
  to: WorkflowNode,
  toPortId: string,
): number[] {
  const defF = getWorkflowNodeDefinition(from.type);
  const defT = getWorkflowNodeDefinition(to.type);
  const outI = defF.outputs.findIndex((p) => p.id === fromPortId);
  const inI = defT.inputs.findIndex((p) => p.id === toPortId);
  const pyOut = AI_NODE_PORT_TOP + Math.max(0, outI) * AI_NODE_PORT_GAP;
  const pyIn = AI_NODE_PORT_TOP + Math.max(0, inI) * AI_NODE_PORT_GAP;
  const x1 = from.x + from.width - AI_NODE_OUTPUT_PORT_CX;
  const y1 = from.y + pyOut;
  const x2 = to.x + AI_NODE_INPUT_PORT_CX;
  const y2 = to.y + pyIn;
  const off = bezierHorizontalOffset(x1, x2);
  const cx1 = x1 + off;
  const cx2 = x2 - off;
  return [x1, y1, cx1, y1, cx2, y2, x2, y2];
}

export function WorkflowCanvas(props: Props) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const zoom = useEditorStore((s) => s.zoom);
  const pan = useEditorStore((s) => s.pan);
  const page = useEditorStore((s) =>
    s.pages.find((p) => p.id === s.activePageId),
  );
  const wf = page?.workflow ?? { nodes: [], edges: [] };
  const connecting = useEditorStore((s) => s.workflowConnecting);
  const picker = useEditorStore((s) => s.workflowNodePicker);

  const updatePtr = useEditorStore((s) => s.updateWorkflowConnectingPointer);
  const openPicker = useEditorStore((s) => s.openWorkflowNodePicker);

  const [stageSize, setStageSize] = useState({
    w: props.width,
    h: props.height,
  });

  useEffect(() => {
    setStageSize({ w: props.width, h: props.height });
  }, [props.width, props.height]);

  useEffect(() => {
    if (!connecting.active) return;

    const onMove = (e: MouseEvent) => {
      const st = stageRef.current;
      if (!st) return;
      const w = worldFromClient(st, e.clientX, e.clientY);
      updatePtr(w.x, w.y);
    };

    const onUp = (e: MouseEvent) => {
      const st = stageRef.current;
      if (!st) return;
      const w = worldFromClient(st, e.clientX, e.clientY);
      updatePtr(w.x, w.y);
      openPicker(w.x, w.y);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [connecting.active, openPicker, updatePtr]);

  const edgePaths = useMemo(() => {
    const list: { id: string; pts: number[]; dt: string }[] = [];
    for (const e of wf.edges) {
      const a = wf.nodes.find((n) => n.id === e.fromNodeId);
      const b = wf.nodes.find((n) => n.id === e.toNodeId);
      if (!a || !b) continue;
      try {
        const pts = edgeBezierPoints(a, e.fromPortId, b, e.toPortId);
        list.push({ id: e.id, pts, dt: e.dataType });
      } catch {
        /* ignore bad edge */
      }
    }
    return list;
  }, [wf.edges, wf.nodes]);

  const tempLinePts = useMemo(() => {
    if (!connecting.active) return null;
    const ep = connecting.from;
    if (!ep) return null;
    if (ep.kind !== "ai-node") return null;
    const from = wf.nodes.find((n) => n.id === ep.nodeId);
    if (!from) return null;
    const def = getWorkflowNodeDefinition(from.type);
    const outI = def.outputs.findIndex((p) => p.id === ep.portId);
    const pyOut = AI_NODE_PORT_TOP + Math.max(0, outI) * AI_NODE_PORT_GAP;
    const x1 = from.x + from.width - AI_NODE_OUTPUT_PORT_CX;
    const y1 = from.y + pyOut;
    const x2 = connecting.pointerX;
    const y2 = connecting.pointerY;
    const off = bezierHorizontalOffset(x1, x2);
    return [x1, y1, x1 + off, y1, x2 - off, y2, x2, y2];
  }, [connecting, wf.nodes]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const old = useEditorStore.getState().zoom;
    const scaleBy = 1.05;
    const next =
      e.evt.deltaY > 0 ? Math.max(0.05, old / scaleBy) : Math.min(3, old * scaleBy);
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      useEditorStore.getState().setZoom(next);
      return;
    }
    const mousePointTo = {
      x: (pointer.x - stage.x()) / old,
      y: (pointer.y - stage.y()) / old,
    };
    useEditorStore.getState().setZoom(next);
    useEditorStore.getState().setPan({
      x: pointer.x - mousePointTo.x * next,
      y: pointer.y - mousePointTo.y * next,
    });
  };

  return (
    <div className="workflow-canvas-wrap" style={{ position: "relative" }}>
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable
        onDragEnd={(e) => {
          const stage = e.target.getStage();
          if (!stage || e.target !== stage) return;
          useEditorStore.getState().setPan({ x: stage.x(), y: stage.y() });
        }}
        onWheel={handleWheel}
      >
        <Layer listening={false}>
          <Line
            points={[-2000, 0, 8000, 0]}
            stroke="#e2e8f0"
            strokeWidth={1 / zoom}
          />
          <Line
            points={[0, -2000, 0, 8000]}
            stroke="#e2e8f0"
            strokeWidth={1 / zoom}
          />
        </Layer>

        <Layer>
          {edgePaths.map((e) => (
            <Group key={e.id}>
              <Line
                bezier
                points={e.pts}
                stroke={PORT_COLORS[e.dt as keyof typeof PORT_COLORS] ?? "#94a3b8"}
                strokeWidth={2 / zoom}
                lineCap="round"
              />
            </Group>
          ))}

          {tempLinePts && (
            <Line
              bezier
              points={tempLinePts}
              stroke="#42c4c4"
              strokeWidth={2 / zoom}
              dash={[8 / zoom, 6 / zoom]}
              lineCap="round"
            />
          )}

          {wf.nodes.map((node) => (
            <WorkflowNodeView key={node.id} node={node} zoom={zoom} />
          ))}
        </Layer>
      </Stage>

      {picker.open && (
        <NodePicker
          screenX={(() => {
            const st = stageRef.current;
            if (!st) return 0;
            const rect = st.container().getBoundingClientRect();
            return rect.left + pan.x + picker.x * zoom;
          })()}
          screenY={(() => {
            const st = stageRef.current;
            if (!st) return 0;
            const rect = st.container().getBoundingClientRect();
            return rect.top + pan.y + picker.y * zoom;
          })()}
          onClose={() => {
            useEditorStore.getState().closeWorkflowNodePicker();
            useEditorStore.getState().cancelWorkflowConnecting();
          }}
        />
      )}
    </div>
  );
}
