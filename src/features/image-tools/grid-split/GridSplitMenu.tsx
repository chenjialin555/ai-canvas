import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GRID_SPLIT_PRESETS,
  clampGridDimension,
} from "./splitImageToGrid";

type Props = {
  anchor: { left: number; top: number };
  busy?: boolean;
  onClose: () => void;
  onApply: (rows: number, cols: number) => void;
};

export const GridSplitMenu = memo(function GridSplitMenu(props: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);
  const menuRef = useRef<HTMLDivElement>(null);
  const customTimerRef = useRef<number | null>(null);

  const menuLeft = Math.min(
    Math.max(12, props.anchor.left - 40),
    window.innerWidth - 200,
  );
  const menuTop = Math.min(
    Math.max(12, props.anchor.top + 12),
    window.innerHeight - 320,
  );

  const closeAll = useCallback(() => {
    setCustomOpen(false);
    props.onClose();
  }, [props]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeAll]);

  function cancelCustomDelayed() {
    if (customTimerRef.current) {
      window.clearTimeout(customTimerRef.current);
      customTimerRef.current = null;
    }
  }

  function apply(rows: number, cols: number) {
    if (props.busy) return;
    props.onApply(clampGridDimension(rows), clampGridDimension(cols));
    closeAll();
  }

  const customLeft = menuLeft + 168;
  const customTop = menuTop;

  return createPortal(
    <div
      className="grid-split-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeAll();
      }}
    >
      <div
        ref={menuRef}
        className="grid-split-menu"
        style={{ left: menuLeft, top: menuTop }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        role="menu"
        aria-label="宫格切分"
      >
        <div className="grid-split-menu__head">宫格切分</div>
        <ul className="grid-split-menu__list">
          {GRID_SPLIT_PRESETS.map((p) => (
            <li key={p.cells}>
              <button
                type="button"
                className="grid-split-menu__item"
                disabled={props.busy}
                onClick={() => apply(p.rows, p.cols)}
              >
                <span className="grid-split-menu__item-label">{p.label}</span>
                <span className="grid-split-menu__item-meta">
                  {p.rows}×{p.cols}
                </span>
              </button>
            </li>
          ))}
          <li
            className={
              customOpen
                ? "grid-split-menu__custom-row grid-split-menu__custom-row--open"
                : "grid-split-menu__custom-row"
            }
            onMouseEnter={() => {
              cancelCustomDelayed();
              setCustomOpen(true);
            }}
            onMouseLeave={() => {
              cancelCustomDelayed();
              customTimerRef.current = window.setTimeout(
                () => setCustomOpen(false),
                220,
              );
            }}
          >
            <button
              type="button"
              className="grid-split-menu__item grid-split-menu__item--custom"
              disabled={props.busy}
              onClick={() => setCustomOpen(true)}
              aria-expanded={customOpen}
              aria-haspopup="true"
            >
              <span className="grid-split-menu__item-label">自定义</span>
              <span className="grid-split-menu__item-meta">›</span>
            </button>
          </li>
        </ul>
        {props.busy && (
          <p className="grid-split-menu__busy">正在切分…</p>
        )}
      </div>

      {customOpen && (
        <div
          className="grid-split-custom"
          style={{ left: customLeft, top: customTop }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            cancelCustomDelayed();
            setCustomOpen(true);
          }}
          onMouseLeave={() => {
            cancelCustomDelayed();
            customTimerRef.current = window.setTimeout(
              () => setCustomOpen(false),
              220,
            );
          }}
          role="dialog"
          aria-label="自定义宫格"
        >
          <div className="grid-split-custom__head">自定义宫格</div>
          <div className="grid-split-custom__body">
            <label className="grid-split-custom__field">
              <span>行数</span>
              <input
                type="number"
                min={1}
                max={10}
                value={customRows}
                disabled={props.busy}
                onChange={(e) =>
                  setCustomRows(clampGridDimension(Number(e.target.value)))
                }
              />
            </label>
            <label className="grid-split-custom__field">
              <span>列数</span>
              <input
                type="number"
                min={1}
                max={10}
                value={customCols}
                disabled={props.busy}
                onChange={(e) =>
                  setCustomCols(clampGridDimension(Number(e.target.value)))
                }
              />
            </label>
            <p className="grid-split-custom__hint">
              共 {customRows * customCols} 格（最多 10×10）
            </p>
          </div>
          <div className="grid-split-custom__foot">
            <button
              type="button"
              className="grid-split-custom__apply"
              disabled={props.busy}
              onClick={() => apply(customRows, customCols)}
            >
              应用切分
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
});
