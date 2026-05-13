import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { getImageDefaults, useEditorStore } from "../editor/store";
import { exportImageMaskToDataURL } from "../editor/mask";
import type { CanvasElement } from "../editor/types";
import {
  logApiEvent,
  summarizePayloadForLog,
  summarizeResponseBodyForLog,
} from "../lib/apiDebug";
import { formatApiDetail } from "../lib/apiFormat";
import { layoutNewAiImageBox, loadImageNaturalSize } from "../lib/aiImageLayout";

type Props = {
  open: boolean;
  onClose: () => void;
};

export type ImageProvider =
  | "banana"
  | "doubao"
  | "gemini"
  | "flux"
  | "qwen"
  | "gpt-image"
  | "ksyun";

export const PROVIDERS: { id: ImageProvider; label: string }[] = [
  { id: "banana", label: "Banana / Nano Banana" },
  { id: "gemini", label: "Gemini (图)" },
  { id: "doubao", label: "豆包 Doubao" },
  { id: "flux", label: "Flux" },
  { id: "qwen", label: "通义 Qwen" },
  { id: "gpt-image", label: "GPT Image" },
  { id: "ksyun", label: "金山云 KSYUN（预留）" },
];

/** 与 `backend/providers.py` MODEL_PRESETS、Comfly 网关文档一致 */
export const MODEL_CHOICES: Record<
  ImageProvider,
  { value: string; label: string }[]
> = {
  banana: [
    { value: "nano-banana-2-2k", label: "nano-banana-2-2k" },
    {
      value: "gemini-3.1-flash-image-preview-2k",
      label: "gemini-3.1-flash-image-preview-2k",
    },
    {
      value: "gemini-3.1-flash-image-preview-4k",
      label: "gemini-3.1-flash-image-preview-4k",
    },
    { value: "nano-banana-pro", label: "nano-banana-pro" },
    { value: "nano-banana-pro-2k", label: "nano-banana-pro-2k" },
  ],
  gemini: [
    {
      value: "gemini-3.1-flash-image-preview-2k",
      label: "gemini-3.1-flash-image-preview-2k",
    },
    {
      value: "gemini-3.1-flash-image-preview-4k",
      label: "gemini-3.1-flash-image-preview-4k",
    },
  ],
  doubao: [
    {
      value: "doubao-seedream-5-0-260128",
      label: "doubao-seedream-5-0-260128",
    },
    {
      value: "doubao-seedream-4-5-251128",
      label: "doubao-seedream-4-5-251128",
    },
    {
      value: "doubao-seededit-3-0-i2i-250628",
      label: "doubao-seededit-3-0-i2i-250628",
    },
  ],
  flux: [
    { value: "flux-kontext-pro", label: "flux-kontext-pro" },
    { value: "flux-kontext-max", label: "flux-kontext-max" },
    { value: "flux-1.1-pro", label: "flux-1.1-pro" },
    { value: "flux-dev", label: "flux-dev" },
  ],
  qwen: [
    { value: "qwen-image-edit-max", label: "qwen-image-edit-max" },
    { value: "qwen-image-edit", label: "qwen-image-edit" },
    { value: "qwen-image", label: "qwen-image" },
    { value: "qwen-vl-max", label: "qwen-vl-max" },
    { value: "qwen-vl-plus", label: "qwen-vl-plus" },
  ],
  "gpt-image": [{ value: "gpt-image-2", label: "gpt-image-2（仅此一项）" }],
  ksyun: [
    { value: "ksyun-image", label: "ksyun-image（预留）" },
    { value: "ksyun-image-edit", label: "ksyun-image-edit（预留）" },
  ],
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

  const { addElement, selectedIds, getActivePage } = useEditorStore();

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
    if (selected?.type === "image") {
      return "生成结果将作为新图层出现在该图右侧；外框宽高比与生成图真实像素一致，宽度与参考图层对齐，不替换原图与蒙版。";
    }
    return "生成结果将作为新图片加入画布；外框宽高比与生成图真实像素一致。";
  }, [selected]);

  const providerLabel =
    PROVIDERS.find((p) => p.id === provider)?.label ?? provider;

  if (!props.open) return null;

  async function generate() {
    setGenError(null);
    setLoading(true);

    try {
      const page = getActivePage();
      const selected = page.elements.find((el) => el.id === selectedIds[0]);

      const maskDataURL =
        selected?.type === "image" && selected.aiMask
          ? exportImageMaskToDataURL(selected)
          : null;

      const sourceImage =
        selected?.type === "image" ? selected.src : null;

      const mode = maskDataURL
        ? "inpaint"
        : sourceImage
          ? "image-to-image"
          : "generate";

      const traceId = nanoid();

      const payload: Record<string, unknown> = {
        provider,
        model,
        prompt: prompt.trim(),
        image: sourceImage ?? undefined,
        mask: maskDataURL ?? undefined,
        mode,
        ratio,
        resolution,
        watermark,
        traceId,
        clientId: "web",
      };
      if (size.trim()) payload.size = size.trim();
      if (seed.trim()) payload.seed = Number(seed.trim());
      if (guidanceScale.trim()) {
        payload.guidanceScale = Number(guidanceScale.trim());
      }

      logApiEvent("request", "POST /api/generate-image", {
        url: `${window.location.origin}/api/generate-image`,
        traceId,
        headers: { "Content-Type": "application/json", "X-Request-ID": traceId },
        bodySummary: summarizePayloadForLog(payload as Record<string, unknown>),
        bodyJsonBytes: JSON.stringify(payload).length,
      });

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": traceId,
          },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data: { url?: string; detail?: unknown };
        try {
          data = JSON.parse(text) as { url?: string; detail?: unknown };
        } catch {
          logApiEvent("error", "响应非 JSON", {
            httpStatus: res.status,
            traceId,
            requestIdHeader: res.headers.get("X-Request-ID"),
            rawTextHead: text.slice(0, 800),
            rawTextLength: text.length,
          });
          setGenError(
            `接口返回非 JSON（HTTP ${res.status}）：${text.slice(0, 400)}`,
          );
          return;
        }

        logApiEvent("response", `/api/generate-image HTTP ${res.status}`, {
          traceId,
          requestIdHeader: res.headers.get("X-Request-ID"),
          ok: res.ok,
          json: summarizeResponseBodyForLog({ ...data } as Record<string, unknown>),
          rawJsonLength: text.length,
        });

        if (!res.ok) {
          logApiEvent("error", `业务错误 HTTP ${res.status}`, {
            traceId,
            detail: data.detail,
            detailFormatted: formatApiDetail(data.detail),
          });
          setGenError(
            formatApiDetail(data.detail) ||
              `请求失败 HTTP ${res.status}：${text.slice(0, 400)}`,
          );
          return;
        }

        const url = data.url?.trim();
        if (!url) {
          logApiEvent("error", "HTTP 2xx 但缺少 url 字段", { traceId, keys: Object.keys(data) });
          setGenError("后端返回成功，但未包含图片地址 url，请检查网关响应格式。");
          return;
        }

        try {
          const d = await loadImageNaturalSize(url);
          logApiEvent("response", "生成图 intrinsic 像素", {
            naturalWidth: d.w,
            naturalHeight: d.h,
            aspectRatio: Number((d.w / d.h).toFixed(4)),
          });
        } catch {
          logApiEvent("response", "生成图宽高读取失败，使用默认比例排布", {
            urlHead: url.slice(0, 160),
          });
        }

        const box = await layoutNewAiImageBox(url, selected);
        const fromRef = selected?.type === "image";
        const layerName =
          !fromRef
            ? "AI 生图"
            : maskDataURL
              ? "AI 局部重绘"
              : "AI 图生图";

        addElement({
          id: nanoid(),
          type: "image",
          name: layerName,
          ...box,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          src: url,
          ...getImageDefaults(),
        } as CanvasElement);

        props.onClose();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : String(e);
        logApiEvent("error", "fetch 异常（网络/超时等）", {
          traceId,
          message: msg,
          stack: e instanceof Error ? e.stack : undefined,
        });
        setGenError(
          `无法连接后端：${msg}。请确认已运行 uvicorn，且 .env 中 API_PORT 与 vite.config 代理一致（默认 13555）。`,
        );
      }
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
