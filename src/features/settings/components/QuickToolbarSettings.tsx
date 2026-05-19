import { useState } from "react";
import {
  QUICK_TOOL_LIBRARY,
  type QuickToolId,
  type QuickToolbarScopeKey,
} from "../../editor/quick-tools/quickTools";
import { useEditorStore } from "../../editor/store";

const SCOPE_LABEL: Record<QuickToolbarScopeKey, string> = {
  image: "图片",
  text: "文字",
  rect: "矩形",
  arrow: "箭头",
  group: "组合",
  multi: "多选",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function QuickToolbarSettings(props: Props) {
  const quickToolbarConfig = useEditorStore((s) => s.quickToolbarConfig);
  const setQuickToolbarConfig = useEditorStore((s) => s.setQuickToolbarConfig);

  const [scope, setScope] = useState<QuickToolbarScopeKey>("image");

  if (!props.open) return null;

  const current = quickToolbarConfig[scope];

  const available = QUICK_TOOL_LIBRARY.filter((tool) => {
    if (scope === "multi") {
      return tool.id === "group" || tool.id === "copy" || tool.id === "delete";
    }
    return tool.elementTypes.includes(scope);
  });

  function toggle(id: QuickToolId) {
    if (current.includes(id)) {
      setQuickToolbarConfig(
        scope,
        current.filter((x) => x !== id),
      );
    } else {
      setQuickToolbarConfig(scope, [...current, id]);
    }
  }

  return (
    <div
      className="quick-settings-mask"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="quick-settings" onMouseDown={(e) => e.stopPropagation()}>
        <div className="quick-settings-head">
          <strong>快捷工具条</strong>
          <button type="button" onClick={props.onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="quick-settings-body">
          <label className="quick-settings-field">
            <span>配置类型</span>
            <select
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as QuickToolbarScopeKey)
              }
            >
              {(Object.keys(SCOPE_LABEL) as QuickToolbarScopeKey[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {SCOPE_LABEL[k]}
                  </option>
                ),
              )}
            </select>
          </label>

          <p className="quick-settings-hint">
            点击按钮加入或移出当前类型的浮动工具条（画布选中时显示）。
          </p>

          <div className="quick-tool-list">
            {available.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={
                  current.includes(tool.id)
                    ? "quick-tool-pill active"
                    : "quick-tool-pill"
                }
                onClick={() => toggle(tool.id)}
              >
                <span className="quick-tool-pill__icon" aria-hidden>
                  {tool.icon}
                </span>
                {tool.label}
              </button>
            ))}
          </div>

          <div className="quick-current">
            <h4>当前顺序</h4>
            <div className="quick-current-chips">
              {current.length === 0 && (
                <span className="quick-current-empty">（空，将恢复默认）</span>
              )}
              {current.map((id) => {
                const tool = QUICK_TOOL_LIBRARY.find((t) => t.id === id);
                if (!tool) return null;
                return (
                  <span key={id} className="quick-current-chip">
                    {tool.icon} {tool.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
