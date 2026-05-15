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

const pickerShell: CSSProperties = {
  position: "fixed",
  width: 272,
  maxHeight: 360,
  overflow: "auto",
  background: "rgba(255, 255, 255, 0.96)",
  border: "1px solid #dceaea",
  borderRadius: 14,
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.16)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
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
        ...pickerShell,
        left: Math.min(props.screenX, window.innerWidth - 288),
        top: Math.min(props.screenY, window.innerHeight - 380),
      }}
    >
      <input
        type="search"
        placeholder="搜索节点…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 10,
          padding: "8px 10px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 13,
          outline: "none",
          background: "rgba(255,255,255,0.9)",
        }}
      />
      {defs.map((d) => (
        <button
          key={d.type}
          type="button"
          onClick={() => {
            useEditorStore.getState().createWorkflowNodeFromPicker(d.type);
            props.onClose();
          }}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "10px 8px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            borderRadius: 10,
            transition: "background 0.12s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(53, 199, 201, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
            {d.title}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {d.description}
          </div>
        </button>
      ))}
      {defs.length === 0 && (
        <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 4px" }}>
          无匹配节点
        </div>
      )}
    </div>
  );
}
