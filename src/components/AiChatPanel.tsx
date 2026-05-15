import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { getImageDefaults, useEditorStore } from "../editor/store";
import type { CanvasElement } from "../editor/types";
import {
  logApiEvent,
  summarizePayloadForLog,
  summarizeResponseBodyForLog,
} from "../lib/apiDebug";
import { formatApiDetail } from "../lib/apiFormat";
import { layoutNewAiImageBox, loadImageNaturalSize } from "../lib/aiImageLayout";
import {
  MODEL_CHOICES,
  PROVIDERS,
  type ImageProvider,
} from "../ai/generation/generationTypes";
import { postGenerateImage } from "../ai/api/generationApi";

type ChatMsg =
  | {
      id: string;
      role: "user";
      text: string;
      thumbs: { elementId: string; src: string; idx: number }[];
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      model?: string;
      error?: boolean;
    };

type Props = {
  attachmentIds: string[];
  onRemoveAttachment: (elementId: string) => void;
};

export function AiChatPanel(props: Props) {
  const { attachmentIds, onRemoveAttachment } = props;
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<ImageProvider>("banana");
  const [model, setModel] = useState(MODEL_CHOICES.banana[0]!.value);
  const [ratio, setRatio] = useState("16x9");
  const [resolution, setResolution] = useState("1K");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { addElement, getActivePage } = useEditorStore();

  const resolved = useMemo(() => {
    const page = getActivePage();
    const list: { elementId: string; src: string; idx: number }[] = [];
    let i = 0;
    for (const id of attachmentIds) {
      const el = page.elements.find((e) => e.id === id);
      if (el?.type === "image") {
        i += 1;
        list.push({ elementId: id, src: el.src, idx: i });
      }
    }
    return list;
  }, [attachmentIds, getActivePage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    const page = getActivePage();
    const srcList = resolved.map((r) => r.src);
    const image = srcList[0];
    const referenceImages =
      srcList.length > 1 ? srcList.slice(1) : undefined;

    let fullPrompt = trimmed;
    if (resolved.length > 0) {
      const labels = resolved.map((r) => `图片${r.idx}`).join("、");
      fullPrompt += `\n\n（画布参考顺序：${labels}）`;
    }

    const mode =
      srcList.length > 0 ? "image-to-image" : "generate";

    const firstRef = page.elements.find((e) => e.id === attachmentIds[0]);
    const refForLayout =
      firstRef?.type === "image" ? firstRef : undefined;

    const traceId = nanoid();
    const payload: Record<string, unknown> = {
      provider,
      model,
      prompt: fullPrompt,
      mode,
      ratio,
      resolution,
      traceId,
      clientId: "web",
    };
    if (image) payload.image = image;
    if (referenceImages?.length) payload.referenceImages = referenceImages;

    const userMsg: ChatMsg = {
      id: nanoid(),
      role: "user",
      text: trimmed,
      thumbs: resolved.map((r) => ({
        elementId: r.elementId,
        src: r.src,
        idx: r.idx,
      })),
    };

    setMessages((m) => [...m, userMsg]);
    setPrompt("");
    setLoading(true);

    logApiEvent("request", "POST /api/generate-image (AI 对话)", {
      url: `${window.location.origin}/api/generate-image`,
      traceId,
      headers: { "Content-Type": "application/json", "X-Request-ID": traceId },
      bodySummary: summarizePayloadForLog(payload as Record<string, unknown>),
      bodyJsonBytes: JSON.stringify(payload).length,
    });

    try {
      const apiRes = await postGenerateImage(payload, traceId);

      if (!apiRes.ok) {
        if (apiRes.reason === "not_json") {
          logApiEvent("error", "AI 对话 响应非 JSON", {
            httpStatus: apiRes.status,
            traceId,
            rawTextHead: apiRes.rawText.slice(0, 800),
          });
          setMessages((m) => [
            ...m,
            {
              id: nanoid(),
              role: "assistant",
              text: `接口返回非 JSON（HTTP ${apiRes.status}）：${apiRes.rawText.slice(0, 400)}`,
              error: true,
            },
          ]);
          return;
        }
        if (apiRes.reason === "network") {
          setMessages((m) => [
            ...m,
            {
              id: nanoid(),
              role: "assistant",
              text: `错误：${apiRes.message}`,
              error: true,
            },
          ]);
          return;
        }
        const data = apiRes.data;
        logApiEvent("response", `/api/generate-image HTTP ${apiRes.status}`, {
          traceId,
          ok: false,
          json: summarizeResponseBodyForLog({ ...data } as Record<string, unknown>),
        });
        const errText =
          formatApiDetail(data.detail) ||
          `请求失败 HTTP ${apiRes.status}：${apiRes.rawText.slice(0, 400)}`;
        setMessages((m) => [
          ...m,
          {
            id: nanoid(),
            role: "assistant",
            text: `错误：${errText}`,
            model,
            error: true,
          },
        ]);
        return;
      }

      const { data, status } = apiRes;
      logApiEvent("response", `/api/generate-image HTTP ${status}`, {
        traceId,
        ok: true,
        json: summarizeResponseBodyForLog({ ...data } as Record<string, unknown>),
      });

      const url = data.url?.trim();
      if (!url) {
        setMessages((m) => [
          ...m,
          {
            id: nanoid(),
            role: "assistant",
            text: "后端未返回图片地址 url。",
            model,
            error: true,
          },
        ]);
        return;
      }

      try {
        const d = await loadImageNaturalSize(url);
        logApiEvent("response", "AI 对话 生成图 intrinsic", {
          naturalWidth: d.w,
          naturalHeight: d.h,
        });
      } catch {
        /* layout 仍可用默认比例 */
      }

      const box = await layoutNewAiImageBox(url, refForLayout);

      addElement({
        id: nanoid(),
        type: "image",
        name: "AI 对话生图",
        ...box,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        src: url,
        ...getImageDefaults(),
      } as CanvasElement);

      setMessages((m) => [
        ...m,
        {
          id: nanoid(),
          role: "assistant",
          text: "已生成并添加到画布。",
          model,
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [
        ...m,
        {
          id: nanoid(),
          role: "assistant",
          text: `错误：${msg}`,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const providerLabel =
    PROVIDERS.find((p) => p.id === provider)?.label ?? provider;

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-toolbar ai-chat-toolbar--models">
        <label className="ai-chat-field">
          <span className="ai-chat-toolbar-muted">提供方</span>
          <select
            className="ai-chat-select ai-chat-select--block"
            aria-label="模型提供方"
            value={provider}
            onChange={(e) => {
              const next = e.target.value as ImageProvider;
              setProvider(next);
              setModel(MODEL_CHOICES[next][0]!.value);
            }}
            title={providerLabel}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ai-chat-field">
          <span className="ai-chat-toolbar-muted">模型</span>
          <select
            className="ai-chat-select ai-chat-select--block"
            aria-label="具体模型"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            title={
              MODEL_CHOICES[provider].find((m) => m.value === model)?.label ??
              model
            }
          >
            {MODEL_CHOICES[provider].map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ai-chat-toolbar ai-chat-toolbar--second">
        <select
          className="ai-chat-select"
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
        >
          <option value="1x1">1×1</option>
          <option value="2x3">2×3</option>
          <option value="3x2">3×2</option>
          <option value="16x9">16×9</option>
          <option value="9x16">9×16</option>
        </select>
        <select
          className="ai-chat-select"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        >
          <option value="1K">1K</option>
          <option value="2K">2K</option>
          <option value="4K">4K</option>
        </select>
      </div>

      <div className="ai-chat-messages" ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <p className="ai-chat-placeholder">
            在画布图片上右键选择「加入 AI 对话」，可附加多张参考图（图片1、图片2…），输入指令后生成。
          </p>
        )}
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="ai-chat-msg ai-chat-msg--user">
              <div className="ai-chat-msg-inner">
                {msg.thumbs.length > 0 && (
                  <div className="ai-chat-thumbs">
                    {msg.thumbs.map((t) => (
                      <div key={t.elementId} className="ai-chat-thumb-wrap">
                        <span className="ai-chat-thumb-badge">{t.idx}</span>
                        <span className="ai-chat-thumb-tag">已选中</span>
                        <img
                          className="ai-chat-thumb"
                          src={t.src}
                          alt=""
                          draggable={false}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="ai-chat-msg-text">{msg.text}</p>
              </div>
              <div className="ai-chat-avatar ai-chat-avatar--user" aria-hidden />
            </div>
          ) : (
            <div key={msg.id} className="ai-chat-msg ai-chat-msg--bot">
              <div className="ai-chat-avatar ai-chat-avatar--bot" aria-hidden />
              <div
                className={`ai-chat-msg-inner ai-chat-msg-inner--bot ${msg.error ? "ai-chat-msg-inner--err" : ""}`}
              >
                <p className="ai-chat-msg-text">{msg.text}</p>
                {msg.model && (
                  <p className="ai-chat-msg-model">{msg.model}</p>
                )}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="ai-chat-msg ai-chat-msg--bot">
            <div className="ai-chat-avatar ai-chat-avatar--bot" aria-hidden />
            <div className="ai-chat-msg-inner ai-chat-msg-inner--bot ai-chat-msg-inner--typing">
              <span>正在生成</span>
              <span className="ai-chat-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="ai-chat-attach-strip">
          <span className="ai-chat-attach-title">当前引用</span>
          <div className="ai-chat-attach-list">
            {resolved.map((r) => (
              <div key={r.elementId} className="ai-chat-attach-item">
                <span className="ai-chat-thumb-badge ai-chat-thumb-badge--sm">
                  {r.idx}
                </span>
                <img src={r.src} alt="" draggable={false} />
                <button
                  type="button"
                  className="ai-chat-attach-remove"
                  aria-label="移除"
                  onClick={() => onRemoveAttachment(r.elementId)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ai-chat-input-area">
        <textarea
          className="ai-chat-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入消息；可从画布右键添加参考图。Enter 换行，Ctrl+Enter 发送。"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
        />
        <div className="ai-chat-input-meta">
          <span className="ai-chat-toolbar-muted">{providerLabel}</span>
          <button
            type="button"
            className="ai-chat-send"
            disabled={loading || !prompt.trim()}
            onClick={() => void send()}
          >
            {loading ? "…" : "生成"}
          </button>
        </div>
      </div>
    </div>
  );
}
