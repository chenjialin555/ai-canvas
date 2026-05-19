import { useEffect, useMemo, useRef, type RefObject } from "react";
import Konva from "konva";
import { useEditorStore } from "../../editor/store";
import { screenToWorld } from "../utils/coordinates";
import { createRafBatcher } from "../utils/rafBatcher";

const VIEWPORT_STORE_DEBOUNCE_MS = 120;

/**
 * 滚轮/拖画布：优先改 Konva Stage，延迟写 Zustand，避免 pan/zoom 触发整棵 React 树重渲染。
 *
 * 滚轮：上下平移；Shift+滚轮：左右平移；Ctrl+滚轮：以指针为锚点缩放。
 */
export function useImperativeViewport(stageRef: RefObject<Konva.Stage | null>) {
  const interactingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushToStore = useMemo(
    () =>
      createRafBatcher<null>(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const store = useEditorStore.getState();
        const z = stage.scaleX();
        const p = { x: stage.x(), y: stage.y() };
        if (store.zoom !== z) store.setZoom(z);
        if (store.pan.x !== p.x || store.pan.y !== p.y) store.setPan(p);
        interactingRef.current = false;
      }),
    [stageRef],
  );

  function cancelPendingStoreSync() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    flushToStore.cancel();
  }

  /** 滚轮缩放 / 拖动画布期间：禁止 store → stage 回写，避免与 Konva 实时位置打架 */
  function beginStageViewportInteraction() {
    interactingRef.current = true;
    cancelPendingStoreSync();
  }

  function scheduleStoreSync() {
    beginStageViewportInteraction();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      flushToStore(null);
    }, VIEWPORT_STORE_DEBOUNCE_MS);
  }

  const storeZoom = useEditorStore((s) => s.zoom);
  const storePan = useEditorStore((s) => s.pan);

  useEffect(() => {
    if (interactingRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    stage.scale({ x: storeZoom, y: storeZoom });
    stage.position(storePan);
    stage.batchDraw();
  }, [storeZoom, storePan.x, storePan.y, stageRef]);

  function applyStageViewport(zoom: number, pan: { x: number; y: number }) {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scale({ x: zoom, y: zoom });
    stage.position(pan);
    stage.batchDraw();
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const evt = e.evt;

    if (evt.ctrlKey) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const oldScale = stage.scaleX();
      const direction = evt.deltaY > 0 ? -1 : 1;
      const scaleBy = 1.06;
      const nextScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clamped = Math.min(3, Math.max(0.1, nextScale));

      const mousePointTo = screenToWorld(pointer, {
        zoom: oldScale,
        pan: { x: stage.x(), y: stage.y() },
      });

      const pan = {
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      };

      applyStageViewport(clamped, pan);
      scheduleStoreSync();
      return;
    }

    const pan = { x: stage.x(), y: stage.y() };
    if (evt.shiftKey) {
      pan.x -= evt.deltaY + evt.deltaX;
    } else {
      pan.y -= evt.deltaY;
    }

    applyStageViewport(stage.scaleX(), pan);
    scheduleStoreSync();
  }

  function syncViewportFromStage() {
    const stage = stageRef.current;
    if (!stage) return;
    cancelPendingStoreSync();
    const store = useEditorStore.getState();
    const z = stage.scaleX();
    const pan = { x: stage.x(), y: stage.y() };
    if (store.zoom !== z) store.setZoom(z);
    if (store.pan.x !== pan.x || store.pan.y !== pan.y) store.setPan(pan);
    interactingRef.current = false;
  }

  function syncPanFromStageDragEnd() {
    syncViewportFromStage();
  }

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      flushToStore.cancel();
    },
    [flushToStore],
  );

  return {
    handleWheel,
    beginStageViewportInteraction,
    syncPanFromStageDragEnd,
  };
}
