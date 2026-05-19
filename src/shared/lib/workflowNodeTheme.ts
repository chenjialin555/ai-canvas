import type { WorkflowNodeStatus } from "../../features/workflow/model/types";

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
  sectionLabel: string;
  bodyText: string;
  accent: string;
  danger: string;
  link: string;
  linkAlt: string;
  portStroke: string;
  portLabel: string;
  cardRadius: number;
  previewRadius: number;
  descRadius: number;
  shadow: string;
  shadowSelected: string;
  /** 顶栏三色渐变（现代卡片） */
  accentBar: [string, string, string];
  headerFrom: string;
  headerTo: string;
  barIdle: [string, string];
  barSelected: [string, string];
  barRunning: [string, string];
  descBg: string;
  descBorder: string;
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
  runLabel: string;
  ghostBg: string;
  ghostBorder: string;
  ghostText: string;
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

function readTriple(
  prefix: string,
  fallbacks: [string, string, string],
): [string, string, string] {
  return [
    readVar(`${prefix}-1`, fallbacks[0]),
    readVar(`${prefix}-2`, fallbacks[1]),
    readVar(`${prefix}-3`, fallbacks[2]),
  ];
}

/** 从 `themes.css` 的 `--wf-node-*` 读取 Konva 节点配色（随 body.theme-* 变化） */
export function readWorkflowNodeTheme(): WorkflowNodeTheme {
  const bg = readVar("--wf-node-bg", "#ffffff");
  const danger = readVar("--wf-node-danger", "#ef4444");

  const statusDefaults: Record<
    WorkflowNodeStatus,
    WorkflowNodeStatusPill
  > = {
    idle: {
      bg: readVar("--wf-node-status-idle-bg", "#f1f5f9"),
      fg: readVar("--wf-node-status-idle-fg", "#64748b"),
      dot: readVar("--wf-node-status-idle-dot", "#94a3b8"),
      stroke: readVar("--wf-node-status-idle-stroke", "#e2e8f0"),
    },
    ready: {
      bg: readVar("--wf-node-status-idle-bg", "#f1f5f9"),
      fg: readVar("--wf-node-status-idle-fg", "#64748b"),
      dot: readVar("--wf-node-status-idle-dot", "#94a3b8"),
      stroke: readVar("--wf-node-status-idle-stroke", "#e2e8f0"),
    },
    running: {
      bg: readVar("--wf-node-status-running-bg", "#fffbeb"),
      fg: readVar("--wf-node-status-running-fg", "#b45309"),
      dot: readVar("--wf-node-status-running-dot", "#facc15"),
      stroke: readVar("--wf-node-status-running-stroke", "#fde68a"),
    },
    success: {
      bg: readVar("--wf-node-status-success-bg", "#ecfdf5"),
      fg: readVar("--wf-node-status-success-fg", "#059669"),
      dot: readVar("--wf-node-status-success-dot", "#22c55e"),
      stroke: readVar("--wf-node-status-success-stroke", "#a7f3d0"),
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
    border: readVar("--wf-node-border", "rgba(148,163,184,0.24)"),
    borderSelected: readVar("--wf-node-border-selected", "#6d5dfc"),
    divider: readVar("--wf-node-divider", "rgba(148,163,184,0.2)"),
    title: readVar("--wf-node-title", "#0f172a"),
    muted: readVar("--wf-node-muted", "#94a3b8"),
    sectionLabel: readVar("--wf-node-section-label", "#94a3b8"),
    bodyText: readVar("--wf-node-body-text", "#334155"),
    portLabel: readVar("--wf-node-port-label", "#334155"),
    accent: readVar("--wf-node-accent", "#6d5dfc"),
    danger,
    link: readVar("--wf-node-link", "#4f77ff"),
    linkAlt: readVar("--wf-node-link-alt", "#22c55e"),
    portStroke: readVar("--wf-node-port-stroke", "#ffffff"),
    cardRadius: readVarPx("--wf-node-radius", 24),
    previewRadius: readVarPx("--wf-node-preview-radius", 18),
    descRadius: readVarPx("--wf-node-desc-radius", 16),
    shadow: readVar("--wf-node-shadow", "rgba(15,23,42,0.14)"),
    shadowSelected: readVar(
      "--wf-node-shadow-selected",
      "rgba(109,93,252,0.28)",
    ),
    accentBar: readTriple("--wf-node-accent-bar", [
      "#6d7cff",
      "#8b5cf6",
      "#38bdf8",
    ]),
    headerFrom: readVar("--wf-node-header-from", bg),
    headerTo: readVar("--wf-node-header-to", bg),
    barIdle: readPair("--wf-node-bar-idle", ["#6d7cff", "#38bdf8"]),
    barSelected: readPair("--wf-node-bar-selected", ["#6d5dfc", "#0ea5e9"]),
    barRunning: readPair("--wf-node-bar-running", ["#facc15", "#f59e0b"]),
    descBg: readVar("--wf-node-desc-bg", "#f8fafc"),
    descBorder: readVar("--wf-node-desc-border", "#e2e8f0"),
    previewFrom: readVar("--wf-node-preview-from", "#fbfdff"),
    previewTo: readVar("--wf-node-preview-to", "#f8fafc"),
    previewBorder: readVar("--wf-node-preview-border", "#dbe4f0"),
    previewBorderDashed: readVar("--wf-node-preview-border-dashed", "#dbe4f0"),
    errorBg: readVar("--wf-node-error-bg", "#fef2f4"),
    errorBorder: readVar("--wf-node-error-border", "#fecdd3"),
    errorText: readVar("--wf-node-error-text", danger),
    runFrom: readVar("--wf-node-run-from", "#7c6cff"),
    runTo: readVar("--wf-node-run-to", "#5c7cfa"),
    runShadow: readVar("--wf-node-run-shadow", "rgba(92,124,250,0.35)"),
    runDisabledFrom: readVar("--wf-node-run-disabled-from", "#94a3b8"),
    runDisabledTo: readVar("--wf-node-run-disabled-to", "#cbd5e1"),
    runLabel: readVar("--wf-node-run-label", "#ffffff"),
    ghostBg: readVar("--wf-node-ghost-bg", "#f8fafc"),
    ghostBorder: readVar("--wf-node-ghost-border", "#e2e8f0"),
    ghostText: readVar("--wf-node-ghost-text", "#334155"),
    statusPill: (status) => statusDefaults[status] ?? statusDefaults.idle,
  };
}
