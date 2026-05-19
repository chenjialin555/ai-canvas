import { nanoid } from "nanoid";
import { getImageDefaults } from "../../../features/editor/store";
import {
  prepareImageElementForApi,
  type PrepareImagePhase,
} from "../../../features/editor/export/prepareImageElementForApi";
import { yieldToMain } from "../../../shared/lib/yieldToMain";
import type { CanvasElement, Page } from "../../../features/editor/types";
import {
  logApiEvent,
  summarizePayloadForLog,
  summarizeResponseBodyForLog,
} from "../../../shared/lib/apiDebug";
import { normalizeAiError } from "../errors/normalizeAiError";
import { apiUrl } from "../../../shared/api/client";
import { postGenerateImage } from "../api/generationApi";
import {
  buildModalGenerateImagePayload,
  type ModalGenerationFormFields,
} from "../model/generationPayload";
import { resolveGenerationRatio } from "../model/generationRatio";
import { layoutNewAiImageBox, loadImageNaturalSize } from "../model/generationLayout";

export type GenerateImagePhase =
  | PrepareImagePhase
  | "request"
  | "model";

export type GenerateImageFromModalContext = {
  outputMode: "new-layer" | "replace-selected";
  form: ModalGenerationFormFields;
  page: Page;
  primarySelectedId: string | undefined;
  onSuccessClose: () => void;
  addElement: (el: CanvasElement) => void;
  replaceImageKeepFrame: (id: string, url: string) => void;
  onPhase?: (phase: GenerateImagePhase) => void;
};

/**
 * 单步弹窗完整流程：组 payload → 请求 → 日志 → 替换或新增图层（与原先 `AiGenerateModal.generate` 一致）。
 */
export async function generateImageFromModal(
  ctx: GenerateImageFromModalContext,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const selected = ctx.primarySelectedId
    ? ctx.page.elements.find((el) => el.id === ctx.primarySelectedId)
    : undefined;

  const prepared =
    selected?.type === "image"
      ? await prepareImageElementForApi(selected, {
          apiName: "generate-source",
          onPhase: (p) => ctx.onPhase?.(p),
        })
      : null;

  await yieldToMain();
  ctx.onPhase?.("request");

  const ratioSource = prepared
    ? { width: prepared.width, height: prepared.height }
    : selected?.type === "image"
      ? { width: selected.width, height: selected.height }
      : null;

  const resolvedRatio = resolveGenerationRatio(ctx.form.ratio, ratioSource);

  const { payload, traceId } = buildModalGenerateImagePayload(
    ctx.form,
    selected,
    prepared
      ? {
          imageUrl: prepared.imageUrl,
          maskDataURL: prepared.maskDataURL,
        }
      : null,
    resolvedRatio,
  );

  const maskDataURL = prepared?.maskDataURL ?? null;

  logApiEvent("request", "POST /api/generate-image", {
    url: apiUrl("/api/generate-image"),
    traceId,
    headers: { "Content-Type": "application/json", "X-Request-ID": traceId },
    bodySummary: summarizePayloadForLog(payload as Record<string, unknown>),
    bodyJsonBytes: JSON.stringify(payload).length,
  });

  ctx.onPhase?.("model");
  const apiResult = await postGenerateImage(payload, traceId);

  if (!apiResult.ok) {
    if (apiResult.reason === "network") {
      logApiEvent("error", "fetch 异常（网络/超时等）", {
        traceId,
        message: apiResult.message,
      });
      return {
        ok: false,
        message: normalizeAiError(
          { reason: "network", message: apiResult.message },
          `无法连接后端：${apiResult.message}。请确认后端已运行；Web 开发依赖 Vite 代理或设置 VITE_API_BASE_URL；桌面版默认 http://127.0.0.1:13555（与 .env 中 API_PORT 一致）。`,
        ),
      };
    }

    if (apiResult.reason === "not_json") {
      logApiEvent("error", "响应非 JSON", {
        httpStatus: apiResult.status,
        traceId,
        requestIdHeader: apiResult.requestIdHeader,
        rawTextHead: apiResult.rawText.slice(0, 800),
        rawTextLength: apiResult.rawText.length,
      });
      return {
        ok: false,
        message: normalizeAiError(
          {
            reason: "not_json",
            status: apiResult.status,
            message: apiResult.rawText,
          },
          `接口返回非 JSON（HTTP ${apiResult.status}）`,
        ),
      };
    }

    const data = apiResult.data;
    logApiEvent("response", `/api/generate-image HTTP ${apiResult.status}`, {
      traceId,
      requestIdHeader: apiResult.requestIdHeader,
      ok: false,
      json: summarizeResponseBodyForLog({ ...data } as Record<string, unknown>),
      rawJsonLength: apiResult.rawText.length,
    });

    logApiEvent("error", `业务错误 HTTP ${apiResult.status}`, {
      traceId,
      detail: data.detail,
    });
    return {
      ok: false,
      message: normalizeAiError(
        {
          status: apiResult.status,
          detail: data.detail,
          message: apiResult.rawText,
        },
        `请求失败 HTTP ${apiResult.status}`,
      ),
    };
  }

  const { data, rawText, status, requestIdHeader } = apiResult;

  logApiEvent("response", `/api/generate-image HTTP ${status}`, {
    traceId,
    requestIdHeader,
    ok: true,
    json: summarizeResponseBodyForLog({ ...data } as Record<string, unknown>),
    rawJsonLength: rawText.length,
  });

  const url = data.url?.trim();
  if (!url) {
    logApiEvent("error", "HTTP 2xx 但缺少 url 字段", {
      traceId,
      keys: Object.keys(data),
    });
    return {
      ok: false,
      message: "后端返回成功，但未包含图片地址 url，请检查网关响应格式。",
    };
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

  const outputMode = ctx.outputMode;
  const replaceTargetId =
    outputMode === "replace-selected" &&
    selected?.type === "image" &&
    !maskDataURL
      ? selected.id
      : null;

  if (replaceTargetId) {
    ctx.replaceImageKeepFrame(replaceTargetId, url);
    ctx.onSuccessClose();
    return { ok: true };
  }

  const box = await layoutNewAiImageBox(url, selected);
  const fromRef = selected?.type === "image";
  const layerName = !fromRef
    ? "AI 生图"
    : maskDataURL
      ? "AI 局部重绘"
      : "AI 图生图";

  ctx.addElement({
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

  ctx.onSuccessClose();
  return { ok: true };
}
