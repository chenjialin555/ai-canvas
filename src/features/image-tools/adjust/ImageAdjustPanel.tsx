import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { executeElementCommand, useEditorStore } from "../../editor";
import {
  AUTO_ENHANCE_FILTER,
  DEFAULT_IMAGE_FILTER,
  normalizeImageFilter,
  type ImageFilter,
  type ImageFilterKey,
} from "../../editor/image-filter/imageFilter";
import { imageFilterRevision } from "../../editor/image-filter/filterRevision";
import type { CanvasElement } from "../../editor/types";

export type AdjustTab = "light" | "color" | "detail" | "effect";

const TABS: { id: AdjustTab; label: string; icon: string }[] = [
  { id: "light", label: "光线", icon: "◐" },
  { id: "color", label: "颜色", icon: "◎" },
  { id: "detail", label: "细节", icon: "◇" },
  { id: "effect", label: "效果", icon: "◉" },
];

type SliderDef = {
  key: ImageFilterKey;
  label: string;
  min?: number;
  max?: number;
  gradient?: "temperature" | "tint";
};

const TAB_SLIDERS: Record<AdjustTab, SliderDef[]> = {
  light: [
    { key: "brightness", label: "光线" },
    { key: "exposure", label: "曝光" },
    { key: "contrast", label: "对比度" },
    { key: "highlights", label: "高光" },
    { key: "shadows", label: "阴影" },
    { key: "whites", label: "白色" },
    { key: "blacks", label: "黑色" },
  ],
  color: [
    { key: "vibrance", label: "自然饱和度" },
    { key: "saturation", label: "饱和度" },
    { key: "temperature", label: "色温", gradient: "temperature" },
    { key: "tint", label: "色调", gradient: "tint" },
  ],
  detail: [
    { key: "sharpen", label: "锐化" },
    { key: "clarity", label: "清晰度" },
    { key: "grain", label: "颗粒" },
    { key: "vignette", label: "晕影" },
    { key: "softLight", label: "柔光" },
    { key: "glow", label: "辉光" },
  ],
  effect: [
    { key: "clarity", label: "清晰度" },
    { key: "grain", label: "颗粒" },
    { key: "vignette", label: "晕影" },
    { key: "softLight", label: "柔光" },
    { key: "glow", label: "辉光" },
    { key: "blur", label: "模糊", min: 0, max: 100 },
  ],
};

type Props = {
  imageId: string;
  anchor: { left: number; top: number };
  onClose: () => void;
};

const AdjustSlider = memo(function AdjustSlider(props: {
  def: SliderDef;
  value: number;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  const min = props.def.min ?? -100;
  const max = props.def.max ?? 100;
  const gradientClass = props.def.gradient
    ? `image-adjust-slider--${props.def.gradient}`
    : "";

  return (
    <label className="image-adjust-row">
      <span className="image-adjust-row__label">{props.def.label}</span>
      <span className="image-adjust-row__value">{Math.round(props.value)}</span>
      <input
        type="range"
        className={`image-adjust-slider ${gradientClass}`}
        min={min}
        max={max}
        step={1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        onPointerUp={props.onCommit}
        onBlur={props.onCommit}
      />
    </label>
  );
});

export function ImageAdjustPanel(props: Props) {
  const [tab, setTab] = useState<AdjustTab>("light");

  const storeFilterRev = useEditorStore((s) => {
    const page = s.pages.find((p) => p.id === s.activePageId);
    const el = page?.elements.find((e) => e.id === props.imageId);
    if (el?.type !== "image") return null;
    return imageFilterRevision(normalizeImageFilter(el.filter));
  });

  const storeFilter = useEditorStore((s) => {
    const page = s.pages.find((p) => p.id === s.activePageId);
    const el = page?.elements.find((e) => e.id === props.imageId);
    return el?.type === "image" ? el.filter : null;
  });

  const [draft, setDraft] = useState<ImageFilter>(() =>
    normalizeImageFilter(storeFilter),
  );
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (storeFilterRev === null) props.onClose();
  }, [storeFilterRev, props]);

  useEffect(() => {
    if (storeFilterRev === null) return;
    const next = normalizeImageFilter(storeFilter);
    if (storeFilterRev === imageFilterRevision(draftRef.current)) {
      return;
    }
    draftRef.current = next;
    setDraft(next);
  }, [props.imageId, storeFilterRev, storeFilter]);

  const pushFilterToStore = useCallback(
    (filter: ImageFilter) => {
      executeElementCommand({
        type: "updateElement",
        id: props.imageId,
        patch: { filter } as Partial<CanvasElement>,
        history: false,
      });
    },
    [props.imageId],
  );

  const patchFilter = useCallback(
    (next: Partial<ImageFilter>) => {
      const merged = { ...draftRef.current, ...next };
      draftRef.current = merged;
      setDraft(merged);
      pushFilterToStore(merged);
    },
    [pushFilterToStore],
  );

  const commitGesture = useCallback(() => {
    pushFilterToStore(draftRef.current);
    useEditorStore.getState().commitHistory();
  }, [pushFilterToStore]);

  if (storeFilterRev === null) return null;

  function resetFilter() {
    const f = { ...DEFAULT_IMAGE_FILTER };
    draftRef.current = f;
    setDraft(f);
    executeElementCommand({
      type: "updateElement",
      id: props.imageId,
      patch: { filter: f } as Partial<CanvasElement>,
    });
  }

  function autoEnhance() {
    const f = { ...AUTO_ENHANCE_FILTER };
    draftRef.current = f;
    setDraft(f);
    executeElementCommand({
      type: "updateElement",
      id: props.imageId,
      patch: { filter: f } as Partial<CanvasElement>,
    });
  }

  const panelLeft = Math.min(
    Math.max(12, props.anchor.left + 24),
    window.innerWidth - 292,
  );
  const panelTop = Math.min(
    Math.max(12, props.anchor.top - 20),
    window.innerHeight - 420,
  );

  const sliders = TAB_SLIDERS[tab];

  return createPortal(
    <div
      className="image-adjust-panel"
      style={{ left: panelLeft, top: panelTop }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="图片调整"
    >
      <header className="image-adjust-panel__head">
        <span className="image-adjust-panel__title">调整</span>
        <div className="image-adjust-panel__actions">
          <button
            type="button"
            className="image-adjust-panel__icon-btn"
            title="重置"
            aria-label="重置"
            onClick={resetFilter}
          >
            ↺
          </button>
          <button
            type="button"
            className="image-adjust-panel__icon-btn"
            title="自动增强"
            aria-label="自动增强"
            onClick={autoEnhance}
          >
            ✦
          </button>
          <button
            type="button"
            className="image-adjust-panel__icon-btn"
            title="关闭"
            aria-label="关闭"
            onClick={props.onClose}
          >
            ×
          </button>
        </div>
      </header>

      <nav className="image-adjust-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            title={t.label}
            className={
              tab === t.id
                ? "image-adjust-tabs__btn image-adjust-tabs__btn--active"
                : "image-adjust-tabs__btn"
            }
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden>{t.icon}</span>
          </button>
        ))}
      </nav>

      <div className="image-adjust-panel__body">
        {sliders.map((def) => (
          <AdjustSlider
            key={`${tab}-${def.key}`}
            def={def}
            value={draft[def.key]}
            onChange={(v) => patchFilter({ [def.key]: v })}
            onCommit={commitGesture}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}
