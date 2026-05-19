import { useState } from "react";
import {
  applyUiTheme,
  getStoredUiTheme,
  UI_THEME_OPTIONS,
  type UiThemeId,
  type UiThemeOption,
} from "../../../shared/lib/uiTheme";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AppearanceSettings(props: Props) {
  const [themeId, setThemeId] = useState<UiThemeId>(() => getStoredUiTheme());

  if (!props.open) return null;

  function pick(id: UiThemeId) {
    setThemeId(id);
    applyUiTheme(id);
  }

  return (
    <div
      className="quick-settings-mask"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        className="appearance-settings quick-settings"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="quick-settings-head">
          <strong>设置</strong>
          <button type="button" onClick={props.onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="quick-settings-body">
          <p className="appearance-settings__hint">界面主题</p>
          <div className="appearance-theme-grid">
            {UI_THEME_OPTIONS.map((theme: UiThemeOption) => (
              <button
                key={theme.id}
                type="button"
                className={
                  themeId === theme.id
                    ? "appearance-theme-card active"
                    : "appearance-theme-card"
                }
                onClick={() => pick(theme.id)}
              >
                <span className="appearance-theme-card__label">{theme.label}</span>
                <span className="appearance-theme-card__desc">
                  {theme.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
