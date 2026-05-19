import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import type { CanvasElement } from "../../editor/types";
import { setGuidesRuntime } from "../guides/guidesRuntime";
import { getSnap } from "./getSnap";
import {
  gestureHistoryDragEnd,
  gestureHistoryDragStart,
  gestureHistoryTransformEnd,
  gestureHistoryTransformStart,
} from "../../editor/commands/interactionGestureHistory";
import {
  ELEMENT_DRAG_COMMIT_PX,
  ELEMENT_DRAG_DISTANCE,
  isNegligibleDrag,
} from "../utils/dragThreshold";

const DRAG_START_X = "_dragStartX";
const DRAG_START_Y = "_dragStartY";

export function commonProps(element: CanvasElement) {
  return {
    id: element.id,
    name: "editable-node",
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    opacity: element.opacity,
    draggable: !element.locked,
    dragDistance: ELEMENT_DRAG_DISTANCE,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;

      const state = useEditorStore.getState();

      if (state.editingTextId) return;

      if (e.evt.shiftKey) {
        if (state.selectedIds.includes(element.id)) {
          state.setSelectedIds(
            state.selectedIds.filter((id) => id !== element.id),
          );
        } else {
          state.setSelectedIds([...state.selectedIds, element.id]);
        }
      } else {
        state.setSelectedIds([element.id]);
      }
    },
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      const latest = useEditorStore
        .getState()
        .getActivePage()
        .elements.find((el) => el.id === element.id);
      const sx = latest?.x ?? e.target.x();
      const sy = latest?.y ?? e.target.y();
      e.target.setAttr(DRAG_START_X, sx);
      e.target.setAttr(DRAG_START_Y, sy);
      useEditorStore.getState().setFloatingToolbarSuppressed(true);
      gestureHistoryDragStart();
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      const state = useEditorStore.getState();
      const pg = state.getActivePage();
      const latest = pg.elements.find((el) => el.id === element.id);
      if (!latest) return;

      const moving = {
        ...latest,
        x: e.target.x(),
        y: e.target.y(),
      };

      const snap = getSnap(
        moving,
        pg.elements.filter((el) => !state.selectedIds.includes(el.id)),
      );

      e.target.position({ x: snap.x, y: snap.y });
      setGuidesRuntime(snap.guides);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      setGuidesRuntime([]);
      useEditorStore.getState().setFloatingToolbarSuppressed(false);
      try {
        const state = useEditorStore.getState();
        const pg = state.getActivePage();
        const latest = pg.elements.find((el) => el.id === element.id);
        if (!latest) return;

        const startX = (e.target.getAttr(DRAG_START_X) as number | undefined) ?? latest.x;
        const startY = (e.target.getAttr(DRAG_START_Y) as number | undefined) ?? latest.y;
        const dx = e.target.x() - startX;
        const dy = e.target.y() - startY;

        if (isNegligibleDrag(dx, dy, ELEMENT_DRAG_COMMIT_PX)) {
          e.target.position({ x: latest.x, y: latest.y });
          return;
        }

        const moving = {
          ...latest,
          x: e.target.x(),
          y: e.target.y(),
        };

        const snap = getSnap(
          moving,
          pg.elements.filter((el) => !state.selectedIds.includes(el.id)),
        );

        e.target.position({
          x: snap.x,
          y: snap.y,
        });

        useEditorStore.getState().updateElement(
          element.id,
          {
            x: Math.round(snap.x),
            y: Math.round(snap.y),
          } as Partial<CanvasElement>,
          { history: false },
        );
      } finally {
        gestureHistoryDragEnd();
      }
    },
    onTransformStart: () => {
      gestureHistoryTransformStart();
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      try {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        useEditorStore.getState().updateElement(
          element.id,
          {
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.max(5, Math.round(element.width * scaleX)),
            height: Math.max(5, Math.round(element.height * scaleY)),
            rotation: Math.round(node.rotation()),
          } as Partial<CanvasElement>,
          { history: false },
        );
      } finally {
        gestureHistoryTransformEnd();
      }
    },
  };
}
