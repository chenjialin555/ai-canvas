import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "../../editor/store";
import { generateImageFromModal } from "./generationService";
import { MODEL_CHOICES, PROVIDERS, type ImageProvider } from "./generationTypes";

export type { ImageProvider } from "./generationTypes";
export { MODEL_CHOICES, PROVIDERS };

type Props = {
  open: boolean;
  onClose: () => void;
  /** 生成结果：新图层（默认）或替换当前选中的图片 */
  outputMode?: "new-layer" | "replace-selected";
};

export function AiGenerateModal(props: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) setGenError(null);
  }, [props.open]);

  const [provider, setProvider] = useState<ImageProvider>("banana");
  const [model, setModel] = useState(MODEL_CHOICES.banana[0]!.value);
  const [ratio, setRatio] = useState("16x9");
  const [resolution, setResolution] = useState("1K");
  const [size, setSize] = useState("");
  const [seed, setSeed] = useState("");
  const [guidanceScale, setGuidanceScale] = useState("");
  const [watermark, setWatermark] = useState(false);

  const { addElement, selectedIds, getActivePage, replaceImageKeepFrame } =
    useEditorStore();

  const selected = useEditorStore((st) => {
    const pg = st.pages.find((p) => p.id === st.activePageId);
    return pg?.elements.find((el) => el.id === st.selectedIds[0]);
  });

  const modeHint = useMemo(() => {
    if (selected?.type === "image" && selected.aiMask) {
      return "模式：局部重绘（inpaint）";
    }
    if (selected?.type === "image") {
      return "模式：图生图";
    }
    return "模式：文生图";
  }, [selected]);

  const layerResultHint = useMemo(() => {
    const outMode = props.outputMode ?? "new-layer";
    if (
      outMode === "replace-selected" &&
      selected?.type === "image" &&
      !selected.aiMask
    ) {
      return "生成结果将替换当前图片的源内容，图层外框与蒙版设置保持不变（无局部蒙版时）。";
    }
    if (selected?.type === "image") {
      return "生成结果将作为新图层出现在该图右侧；外框宽高比与生成图真实像素一致，宽度与参考图层对齐，不替换原图与蒙版。";
    }
    return "生成结果将作为新图片加入画布；外框宽高比与生成图真实像素一致。";
  }, [selected, props.outputMode]);

  const providerLabel =
    PROVIDERS.find((p) => p.id === provider)?.label ?? provider;

  if (!props.open) return null;

  async function generate() {
    setGenError(null);
    setLoading(true);
    try {
      const page = getActivePage();
      const result = await generateImageFromModal({
        outputMode: props.outputMode ?? "new-layer",
        form: {
          provider,
          model,
          prompt,
          ratio,
          resolution,
          watermark,
          size,
          seed,
          guidanceScale,
        },
        page,
        primarySelectedId: selectedIds[0],
        onSuccessClose: props.onClose,
        addElement,
        replaceImageKeepFrame,
      });
      if (!result.ok) setGenError(result.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-mask">
      <div className={`ai-modal ${loading ? "ai-modal--busy" : ""}`}>
        <div className="ai-modal-head">
          <strong>AI 生图编辑</strong>
          <button
            type="button"
            onClick={props.onClose}
            disabled={loading}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="ai-modal-loading-overlay" role="status" aria-live="polite">
            <div className="ai-gen-spinner" aria-hidden />
            <p className="ai-gen-status-title">正在生成图片…</p>
            <p className="ai-gen-status-detail">
              {providerLabel}
              <br />
              <span style={{ fontFamily: "ui-monospace, monospace" }}>{model}</span>
            </p>
            <p className="ai-gen-status-detail" style={{ fontSize: 12 }}>
              {modeHint}
            </p>
            <p className="ai-gen-status-detail" style={{ fontSize: 11, opacity: 0.92 }}>
              {layerResultHint}
            </p>
            <p className="ai-gen-status-hint">
              已向后端发送请求，模型推理可能需要数十秒，请稍候。关闭控制台也不影响此处状态。
            </p>
            <div className="ai-gen-dots" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div className="ai-modal-body">
          <div className="ai-row">
            <label htmlFor="ai-provider">模型提供方</label>
            <select
              id="ai-provider"
              className="ai-input"
              value={provider}
              onChange={(e) => {
                const next = e.target.value as ImageProvider;
                setProvider(next);
                setModel(MODEL_CHOICES[next][0]!.value);
              }}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-row">
            <label htmlFor="ai-model">模型 model</label>
            <select
              id="ai-model"
              className="ai-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODEL_CHOICES[provider].map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-row-inline">
            <div className="ai-row" style={{ marginBottom: 0 }}>
              <label htmlFor="ai-ratio">比例 ratio</label>
              <select
                id="ai-ratio"
                className="ai-input"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
              >
                <option value="1x1">1x1</option>
                <option value="2x3">2x3</option>
                <option value="3x2">3x2</option>
                <option value="4x5">4x5</option>
                <option value="5x4">5x4</option>
                <option value="16x9">16x9</option>
                <option value="9x16">9x16</option>
                <option value="21x9">21x9</option>
              </select>
            </div>
            <div className="ai-row" style={{ marginBottom: 0 }}>
              <label htmlFor="ai-resolution">分辨率</label>
              <select
                id="ai-resolution"
                className="ai-input"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="请输入生图提示词，例如：现代客厅，落地窗，暖色灯光，真实摄影风格..."
          />
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.45,
            }}
          >
            {layerResultHint}
          </p>

          <details className="ai-advanced">
            <summary>高级参数（Doubao / 其它网关）</summary>

            <div className="ai-row">
              <label htmlFor="ai-size">size（如 2048x2048）</label>
              <input
                id="ai-size"
                className="ai-input"
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="可选"
              />
            </div>

            <div className="ai-row-inline">
              <div className="ai-row" style={{ marginBottom: 0 }}>
                <label htmlFor="ai-seed">seed</label>
                <input
                  id="ai-seed"
                  className="ai-input"
                  type="text"
                  inputMode="numeric"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="可选"
                />
              </div>
              <div className="ai-row" style={{ marginBottom: 0 }}>
                <label htmlFor="ai-guidance">guidanceScale</label>
                <input
                  id="ai-guidance"
                  className="ai-input"
                  type="text"
                  inputMode="decimal"
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(e.target.value)}
                  placeholder="可选"
                />
              </div>
            </div>

            <label className="ai-row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>水印（Doubao 等）</span>
            </label>
          </details>
        </div>

        {genError && (
          <div className="ai-gen-error" role="alert">
            {genError}
          </div>
        )}

        <div className="ai-modal-actions">
          <button type="button" onClick={props.onClose} disabled={loading}>
            取消
          </button>
          <button
            type="button"
            className="primary-small"
            onClick={generate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? "生成中…" : "生成图片"}
          </button>
        </div>
      </div>
    </div>
  );
}
