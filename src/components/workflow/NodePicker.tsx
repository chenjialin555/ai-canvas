import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useEditorStore } from "../../editor/store";
import { listCreatableWorkflowNodes } from "../../workflow/nodeRegistry";

type Props = {
  screenX: number;
  screenY: number;
  onClose: () => void;
};

const pickerPosition: CSSProperties = {
  position: "fixed",
  width: 272,
  maxHeight: 360,
  overflow: "auto",
  zIndex: 2000,
  padding: 12,
};

export function NodePicker(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const fromDt = useEditorStore((s) => s.workflowNodePicker.dataType);

  /** 单击浮层外任意区域关闭（避免与打开它的同一事件链冲突，延后一帧注册） */
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(e.target as Node)) return;
      useEditorStore.getState().closeWorkflowNodePicker();
      useEditorStore.getState().cancelWorkflowConnecting();
    };
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown, true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  const defs = useMemo(() => {
    const base = listCreatableWorkflowNodes(fromDt ?? null);
    const t = q.trim().toLowerCase();
    if (!t) return base;
    return base.filter(
      (d) =>
        d.title.toLowerCase().includes(t) ||
        d.type.toLowerCase().includes(t) ||
        d.description.toLowerCase().includes(t),
    );
  }, [q, fromDt]);

  return (
    <div
      ref={rootRef}
      className="workflow-node-picker"
      style={{
        ...pickerPosition,
        left: Math.min(props.screenX, window.innerWidth - 288),
        top: Math.min(props.screenY, window.innerHeight - 380),
      }}
    >
      <input
        type="search"
        className="workflow-node-picker__search"
        placeholder="搜索节点…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {defs.map((d) => (
        <button
          key={d.type}
          type="button"
          className="workflow-node-picker__item"
          onClick={() => {
            useEditorStore.getState().createWorkflowNodeFromPicker(d.type);
            props.onClose();
          }}
        >
          <div className="workflow-node-picker__title">{d.title}</div>
          <div className="workflow-node-picker__desc">{d.description}</div>
        </button>
      ))}
      {defs.length === 0 && (
        <div className="workflow-node-picker__empty">无匹配节点</div>
      )}
    </div>
  );
}
