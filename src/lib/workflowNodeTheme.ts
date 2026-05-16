import type { WorkflowNodeStatus } from "../workflow/types";

export type WorkflowNodeStatusPill = {
  bg: string;
  fg: string;
  dot: string;
  stroke: string;
};

export type WorkflowNodeTheme = {
  bg: string;
  bgSoft: string;
  footerBg: string;
  border: string;
  borderSelected: string;
  divider: string;
  title: string;
  muted: string;
  accent: string;
  danger: string;
  link: string;
  linkAlt: string;
  portStroke: string;
  cardRadius: number;
  previewRadius: number;
  shadow: string;
  shadowSelected: string;
  headerFrom: string;
  headerTo: string;
  barIdle: [string, string];
  barSelected: [string, string];
  barRunning: [string, string];
  previewFrom: string;
  previewTo: string;
  previewBorder: string;
  previewBorderDashed: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  runFrom: string;
  runTo: string;
  runShadow: string;
  runDisabledFrom: string;
  runDisabledTo: string;
  statusPill: (status: WorkflowNodeStatus) => WorkflowNodeStatusPill;
};

function readVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

function readVarPx(name: string, fallback: number): number {
  const raw = readVar(name, "");
  if (!raw) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readPair(prefix: string, fallbacks: [string, string]): [string, string] {
  return [
    readVar(`${prefix}-from`, fallbacks[0]),
    readVar(`${prefix}-to`, fallbacks[1]),
  ];
}

/** 从 `themes.css` 的 `--wf-node-*` 读取 Konva 节点配色（随 body.theme-* 变化） */
export function readWorkflowNodeTheme(): WorkflowNodeTheme {
  const bg = readVar("--wf-node-bg", "#1e293b");
  const danger = readVar("--wf-node-danger", "#ef4444");

  const statusDefaults: Record<
    WorkflowNodeStatus,
    WorkflowNodeStatusPill
  > = {
    idle: {
      bg: readVar("--wf-node-status-idle-bg", "#f1f5f9"),
      fg: readVar("--wf-node-status-idle-fg", "#64748b"),
      dot: readVar("--wf-node-status-idle-dot", "#94a3b8"),
      stroke: "transparent",
    },
    ready: {
      bg: readVar("--wf-node-status-idle-bg", "#f1f5f9"),
      fg: readVar("--wf-node-status-idle-fg", "#64748b"),
      dot: readVar("--wf-node-status-idle-dot", "#94a3b8"),
      stroke: "transparent",
    },
    running: {
      bg: readVar("--wf-node-status-running-bg", "#fffbeb"),
      fg: readVar("--wf-node-status-running-fg", "#b45309"),
      dot: readVar("--wf-node-status-running-dot", "#facc15"),
      stroke: "transparent",
    },
    success: {
      bg: readVar("--wf-node-status-success-bg", "#ecfdf5"),
      fg: readVar("--wf-node-status-success-fg", "#059669"),
      dot: readVar("--wf-node-status-success-dot", "#22c55e"),
      stroke: "transparent",
    },
    error: {
      bg: readVar("--wf-node-status-error-bg", "#fef2f4"),
      fg: readVar("--wf-node-status-error-fg", danger),
      dot: readVar("--wf-node-status-error-dot", danger),
      stroke: readVar("--wf-node-status-error-stroke", "#fecdd3"),
    },
  };

  return {
    bg,
    bgSoft: readVar("--wf-node-bg-soft", bg),
    footerBg: readVar("--wf-node-footer-bg", bg),
    border: readVar("--wf-node-border", "rgba(255,255,255,0.16)"),
    borderSelected: readVar("--wf-node-border-selected", "#ff9f43"),
    divider: readVar("--wf-node-divider", "rgba(255,255,255,0.1)"),
    title: readVar("--wf-node-title", "#f8fafc"),
    muted: readVar("--wf-node-muted", "#94a3b8"),
    accent: readVar("--wf-node-accent", "#ff9f43"),
    danger,
    link: readVar("--wf-node-link", "#3b82f6"),
    linkAlt: readVar("--wf-node-link-alt", "#22c55e"),
    portStroke: readVar("--wf-node-port-stroke", bg),
    cardRadius: readVarPx("--wf-node-radius", 12),
    previewRadius: readVarPx("--wf-node-preview-radius", 8),
    shadow: readVar("--wf-node-shadow", "rgba(0,0,0,0.32)"),
    shadowSelected: readVar(
      "--wf-node-shadow-selected",
      "rgba(255,159,67,0.35)",
    ),
    headerFrom: readVar("--wf-node-header-from", bg),
    headerTo: readVar("--wf-node-header-to", bg),
    barIdle: readPair("--wf-node-bar-idle", ["#475569", "#64748b"]),
    barSelected: readPair("--wf-node-bar-selected", ["#ff9f43", "#3b82f6"]),
    barRunning: readPair("--wf-node-bar-running", ["#facc15", "#f59e0b"]),
    previewFrom: readVar("--wf-node-preview-from", bg),
    previewTo: readVar("--wf-node-preview-to", bg),
    previewBorder: readVar("--wf-node-preview-border", "rgba(255,255,255,0.16)"),
    previewBorderDashed: readVar(
      "--wf-node-preview-border-dashed",
      "rgba(255,255,255,0.1)",
    ),
    errorBg: readVar("--wf-node-error-bg", "#fef2f4"),
    errorBorder: readVar("--wf-node-error-border", "#fecdd3"),
    errorText: readVar("--wf-node-error-text", danger),
    runFrom: readVar("--wf-node-run-from", "#ffb35c"),
    runTo: readVar("--wf-node-run-to", "#ff9f43"),
    runShadow: readVar("--wf-node-run-shadow", "rgba(255,159,67,0.35)"),
    runDisabledFrom: readVar("--wf-node-run-disabled-from", "#64748b"),
    runDisabledTo: readVar("--wf-node-run-disabled-to", "#94a3b8"),
    statusPill: (status) => statusDefaults[status] ?? statusDefaults.idle,
  };
}
