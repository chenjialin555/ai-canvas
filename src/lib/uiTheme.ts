export type UiThemeId =
  | "theme-comfy"
  | "theme-vscode"
  | "theme-cursor-dark"
  | "theme-cursor-light";

export type UiThemeOption = {
  id: UiThemeId;
  label: string;
  description: string;
};

export const UI_THEME_OPTIONS: UiThemeOption[] = [
  {
    id: "theme-comfy",
    label: "ComfyUI Dark",
    description: "专业深色工具 UI，橙色主色",
  },
  {
    id: "theme-vscode",
    label: "VSCode Dark",
    description: "经典编辑器深色主题",
  },
  {
    id: "theme-cursor-dark",
    label: "Cursor Dark",
    description: "紫青渐变，玻璃质感",
  },
  {
    id: "theme-cursor-light",
    label: "Cursor Light",
    description: "浅色界面，适合日间使用",
  },
];

const STORAGE_KEY = "ai-canvas-ui-theme";
const ALL_THEME_CLASSES: UiThemeId[] = UI_THEME_OPTIONS.map((t) => t.id);

/** 主题切换后广播，供 Konva 画布等无法直接用 CSS 的 UI 重读 token */
export const UI_THEME_CHANGE_EVENT = "ai-canvas-ui-theme-change";

export function isUiThemeId(value: string): value is UiThemeId {
  return ALL_THEME_CLASSES.includes(value as UiThemeId);
}

export function getStoredUiTheme(): UiThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isUiThemeId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "theme-comfy";
}

export function applyUiTheme(themeId: UiThemeId): void {
  const body = document.body;
  body.classList.remove(...ALL_THEME_CLASSES);
  body.classList.add(themeId);
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(UI_THEME_CHANGE_EVENT));
}

/** 在 React 挂载前调用，避免主题闪烁 */
export function initUiTheme(): UiThemeId {
  const theme = getStoredUiTheme();
  applyUiTheme(theme);
  return theme;
}
