import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import type { CanvasElement } from "../../editor/types";
import type { GuideLine } from "../types";
import { getSnap } from "./getSnap";
import {
  gestureHistoryDragEnd,
  gestureHistoryDragStart,
  gestureHistoryTransformEnd,
  gestureHistoryTransformStart,
} from "../../editor/commands/interactionGestureHistory";

export function commonProps(element: CanvasElement, setGuides: (g: GuideLine[]) => void) {
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
    onDragStart: () => {
      useEditorStore.getState().setFloatingToolbarSuppressed(true);
      gestureHistoryDragStart();
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      const state = useEditorStore.getState();
      const pg = state.getActivePage();

      const moving = {
        ...element,
        x: e.target.x(),
        y: e.target.y(),
      };

      const snap = getSnap(
        moving,
        pg.elements.filter((el) => !state.selectedIds.includes(el.id)),
      );

      e.target.position({ x: snap.x, y: snap.y });
      setGuides(snap.guides);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      setGuides([]);
      useEditorStore.getState().setFloatingToolbarSuppressed(false);
      try {
        const state = useEditorStore.getState();
        const pg = state.getActivePage();

        const moving = {
          ...element,
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
