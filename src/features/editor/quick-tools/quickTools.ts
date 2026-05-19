export type QuickToolbarElementType =
  | "image"
  | "rect"
  | "text"
  | "arrow"
  | "group";

export type QuickToolId =
  | "crop"
  | "grid-split"
  | "adjust"
  | "mask"
  | "parse3d"
  | "generate-node"
  | "connect"
  | "replace-image"
  | "save-library"
  | "copy"
  | "delete"
  | "lock"
  | "bring-front"
  | "send-back"
  | "ungroup"
  | "group";

/** 单元素类型 + 多选时的快捷条配置键 */
export type QuickToolbarScopeKey = QuickToolbarElementType | "multi";

export type QuickTool = {
  id: QuickToolId;
  label: string;
  icon: string;
  elementTypes: QuickToolbarElementType[];
};

export const QUICK_TOOL_LIBRARY: QuickTool[] = [
  {
    id: "crop",
    label: "裁剪",
    icon: "✂",
    elementTypes: ["image"],
  },
  {
    id: "grid-split",
    label: "宫格切分",
    icon: "⊞",
    elementTypes: ["image"],
  },
  {
    id: "adjust",
    label: "调整",
    icon: "☼",
    elementTypes: ["image"],
  },
  {
    id: "mask",
    label: "蒙版",
    icon: "◐",
    elementTypes: ["image"],
  },
  {
    id: "parse3d",
    label: "解析3D",
    icon: "3D",
    elementTypes: ["image"],
  },
  {
    id: "generate-node",
    label: "生成节点",
    icon: "↗",
    elementTypes: ["image"],
  },
  {
    id: "connect",
    label: "连线",
    icon: "⛓",
    elementTypes: ["image", "rect", "text", "arrow", "group"],
  },
  {
    id: "replace-image",
    label: "替换图",
    icon: "🖼",
    elementTypes: ["image"],
  },
  {
    id: "save-library",
    label: "素材库",
    icon: "☆",
    elementTypes: ["image"],
  },
  {
    id: "copy",
    label: "复制",
    icon: "⧉",
    elementTypes: ["image", "rect", "text", "arrow", "group"],
  },
  {
    id: "delete",
    label: "删除",
    icon: "⌫",
    elementTypes: ["image", "rect", "text", "arrow", "group"],
  },
  {
    id: "lock",
    label: "锁定",
    icon: "🔒",
    elementTypes: ["image", "rect", "text", "arrow", "group"],
  },
  {
    id: "bring-front",
    label: "置顶",
    icon: "↑",
    elementTypes: ["image", "rect", "text", "arrow", "group"],
  },
  {
    id: "send-back",
    label: "置底",
    icon: "↓",
    elementTypes: ["image", "rect", "text", "arrow", "group"],
  },
  {
    id: "ungroup",
    label: "拆组",
    icon: "⎘",
    elementTypes: ["group"],
  },
  {
    id: "group",
    label: "组合",
    icon: "▦",
    elementTypes: ["image", "rect", "text", "arrow", "group"],
  },
];

const libraryById = new Map(QUICK_TOOL_LIBRARY.map((t) => [t.id, t]));

export function getToolById(id: QuickToolId): QuickTool | undefined {
  return libraryById.get(id);
}

export const DEFAULT_QUICK_TOOLBAR_CONFIG: Record<
  QuickToolbarScopeKey,
  QuickToolId[]
> = {
  image: [
    "crop",
    "grid-split",
    "adjust",
    "mask",
    "parse3d",
    "generate-node",
    "connect",
    "replace-image",
    "save-library",
    "copy",
    "delete",
  ],
  text: ["copy", "delete", "lock", "bring-front", "send-back"],
  rect: ["copy", "delete", "lock", "bring-front", "send-back"],
  arrow: ["copy", "delete", "lock", "bring-front", "send-back"],
  group: ["ungroup", "copy", "delete", "lock", "bring-front", "send-back"],
  multi: ["group", "copy", "delete"],
};

const ALL_IDS = new Set(QUICK_TOOL_LIBRARY.map((t) => t.id));

export function normalizeQuickToolbarIds(
  ids: unknown,
  scope: QuickToolbarScopeKey,
): QuickToolId[] {
  if (!Array.isArray(ids)) return [...DEFAULT_QUICK_TOOLBAR_CONFIG[scope]];
  const out: QuickToolId[] = [];
  for (const x of ids) {
    if (typeof x !== "string" || x === "ai-edit" || !ALL_IDS.has(x as QuickToolId)) {
      continue;
    }
    const id = x as QuickToolId;
    const tool = getToolById(id);
    if (!tool) continue;
    if (scope === "multi") {
      if (id === "group" || id === "copy" || id === "delete") out.push(id);
      continue;
    }
    if (tool.elementTypes.includes(scope as QuickToolbarElementType)) out.push(id);
  }
  const resolved = out.length ? out : [...DEFAULT_QUICK_TOOLBAR_CONFIG[scope]];
  if (scope === "image" && !resolved.includes("adjust")) {
    const cropIdx = resolved.indexOf("crop");
    if (cropIdx >= 0) resolved.splice(cropIdx + 1, 0, "adjust");
    else resolved.unshift("adjust");
  }
  if (scope === "image" && !resolved.includes("grid-split")) {
    const cropIdx = resolved.indexOf("crop");
    if (cropIdx >= 0) resolved.splice(cropIdx + 1, 0, "grid-split");
    else resolved.unshift("grid-split");
  }
  return resolved;
}

export function mergeQuickToolbarConfig(
  raw: unknown,
): Record<QuickToolbarScopeKey, QuickToolId[]> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<QuickToolbarScopeKey, QuickToolId[]>
  >;
  const keys: QuickToolbarScopeKey[] = [
    "image",
    "text",
    "rect",
    "arrow",
    "group",
    "multi",
  ];
  const out = { ...DEFAULT_QUICK_TOOLBAR_CONFIG };
  for (const k of keys) {
    out[k] = normalizeQuickToolbarIds(r[k], k);
  }
  return out;
}
