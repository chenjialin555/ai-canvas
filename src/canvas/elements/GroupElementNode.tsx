import { Arrow, Group, Image as KonvaImage, Rect, Text } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "../../editor/store";
import { EMPTY_ELEMENTS } from "../../editor/store/shallowEqual";
import type { CanvasElement, ImageElement } from "../../editor/types";
import { setGuidesRuntime } from "../guides/guidesRuntime";
import { getSnap } from "./getSnap";
import { useCanvasImage } from "./useCanvasImage";
import {
  gestureHistoryDragEnd,
  gestureHistoryDragStart,
} from "../../editor/commands/interactionGestureHistory";

function GroupChildPreview(props: { child: CanvasElement; group: CanvasElement }) {
  const dx = props.child.x - props.group.x;
  const dy = props.child.y - props.group.y;

  if (props.child.type === "rect") {
    const c = props.child;
    return (
      <Rect
        x={dx}
        y={dy}
        width={c.width}
        height={c.height}
        rotation={c.rotation}
        opacity={c.opacity}
        fill={c.fill}
        cornerRadius={c.radius}
        stroke={c.stroke}
        strokeWidth={c.strokeWidth || 0}
        listening={false}
      />
    );
  }

  if (props.child.type === "text") {
    const c = props.child;
    return (
      <Text
        x={dx}
        y={dy}
        width={c.width}
        height={c.height}
        rotation={c.rotation}
        opacity={c.opacity}
        text={c.text}
        fontSize={c.fontSize}
        fontFamily={c.fontFamily}
        fontStyle={c.fontWeight}
        fill={c.color}
        align={c.align}
        verticalAlign="middle"
        listening={false}
      />
    );
  }

  if (props.child.type === "arrow") {
    const c = props.child;
    return (
      <Arrow
        x={dx}
        y={dy}
        width={c.width}
        height={c.height}
        rotation={c.rotation}
        opacity={c.opacity}
        points={[0, c.height / 2, c.width, c.height / 2]}
        stroke={c.stroke}
        fill={c.stroke}
        strokeWidth={c.strokeWidth}
        pointerLength={18}
        pointerWidth={18}
        listening={false}
      />
    );
  }

  if (props.child.type === "image") {
    return (
      <GroupChildImage child={props.child} dx={dx} dy={dy} />
    );
  }

  return null;
}

function GroupChildImage(props: {
  child: ImageElement;
  dx: number;
  dy: number;
}) {
  const img = useCanvasImage(props.child.src);
  const c = props.child;
  const baseScale = img
    ? Math.min(c.width / img.width, c.height / img.height)
    : 1;
  const finalScale = baseScale * (c.cropScale || 1);

  if (!img) {
    return (
      <Rect
        x={props.dx}
        y={props.dy}
        width={c.width}
        height={c.height}
        fill="#e5e7eb"
        listening={false}
      />
    );
  }

  return (
    <Group x={props.dx} y={props.dy} rotation={c.rotation}>
      <KonvaImage
        image={img}
        x={c.width / 2 + (c.cropOffsetX || 0)}
        y={c.height / 2 + (c.cropOffsetY || 0)}
        offsetX={img.width / 2}
        offsetY={img.height / 2}
        width={img.width}
        height={img.height}
        scaleX={finalScale * (c.flipX ? -1 : 1)}
        scaleY={finalScale * (c.flipY ? -1 : 1)}
        rotation={c.cropRotation || 0}
        opacity={c.opacity}
        listening={false}
      />
    </Group>
  );
}

export type GroupElementNodeProps = {
  element: Extract<CanvasElement, { type: "group" }>;
};

export function GroupElementNode(props: GroupElementNodeProps) {
  const g = props.element;
  const children = useEditorStore(
    useShallow((st) => {
      const pg = st.pages.find((p) => p.id === st.activePageId);
      if (!pg) return EMPTY_ELEMENTS;
      return pg.elements.filter((c) => c.parentId === g.id);
    }),
  );

  const selectedIds = useEditorStore((s) => s.selectedIds);

  return (
    <Group
      id={g.id}
      name="editable-node"
      x={g.x}
      y={g.y}
      width={g.width}
      height={g.height}
      rotation={g.rotation}
      opacity={g.opacity}
      draggable={!g.locked}
      onClick={(e) => {
        e.cancelBubble = true;
        const state = useEditorStore.getState();
        if (state.editingTextId) return;
        if (e.evt.shiftKey) {
          if (state.selectedIds.includes(g.id)) {
            state.setSelectedIds(state.selectedIds.filter((id) => id !== g.id));
          } else {
            state.setSelectedIds([...state.selectedIds, g.id]);
          }
        } else {
          state.setSelectedIds([g.id]);
        }
      }}
      onDragStart={() => {
        useEditorStore.getState().setFloatingToolbarSuppressed(true);
        gestureHistoryDragStart();
      }}
      onDragMove={(e) => {
        const state = useEditorStore.getState();
        const pg = state.getActivePage();
        const moving = { ...g, x: e.target.x(), y: e.target.y() };
        const snap = getSnap(
          moving,
          pg.elements.filter((el) => !state.selectedIds.includes(el.id)),
        );
        setGuidesRuntime(snap.guides);
      }}
      onDragEnd={(e) => {
        setGuidesRuntime([]);
        useEditorStore.getState().setFloatingToolbarSuppressed(false);
        try {
          const st = useEditorStore.getState();
          const cur = st.getActivePage().elements.find((x) => x.id === g.id);
          if (!cur || cur.type !== "group") return;

          const pg = st.getActivePage();
          const moving = { ...g, x: e.target.x(), y: e.target.y() };
          const snap = getSnap(
            moving,
            pg.elements.filter((el) => !st.selectedIds.includes(el.id)),
          );
          e.target.position({ x: snap.x, y: snap.y });

          const nx = Math.round(snap.x);
          const ny = Math.round(snap.y);
          const dx = nx - cur.x;
          const dy = ny - cur.y;
          st.updateElement(cur.id, { x: nx, y: ny } as Partial<CanvasElement>, {
            history: false,
          });
          const ch = st.getActivePage().elements.filter((c) => c.parentId === cur.id);
          for (const c of ch) {
            st.updateElement(
              c.id,
              { x: c.x + dx, y: c.y + dy } as Partial<CanvasElement>,
              { history: false },
            );
          }
        } finally {
          gestureHistoryDragEnd();
        }
      }}
    >
      <Rect
        x={0}
        y={0}
        width={g.width}
        height={g.height}
        fill="rgba(66,196,196,0.06)"
        stroke="#2f7cff"
        dash={[6, 4]}
        strokeWidth={1}
        listening={false}
      />
      {children.map((c) => (
        <GroupChildPreview key={c.id} child={c} group={g} />
      ))}
      {selectedIds.includes(g.id) && (
        <Rect
          x={0}
          y={0}
          width={g.width}
          height={g.height}
          stroke="#2f7cff"
          strokeWidth={1}
          listening={false}
        />
      )}
    </Group>
  );
}
