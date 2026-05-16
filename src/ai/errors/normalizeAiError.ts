import { formatApiDetail } from "../../lib/apiFormat";

export type AiErrorInput =
  | string
  | Error
  | {
      code?: string;
      message?: string;
      detail?: unknown;
      status?: number;
      reason?: string;
    }
  | null
  | undefined;

const KEYWORD_HINTS: { pattern: RegExp; message: string }[] = [
  { pattern: /api[_\s-]?key|密钥|DASHSCOPE|OPENAI_API/i, message: "请先在后端配置模型 API 密钥（.env）" },
  { pattern: /timeout|timed?\s*out|超时/i, message: "AI 服务响应超时，请稍后重试" },
  { pattern: /oss|upload|上传/i, message: "图片上传失败，请检查 OSS 配置与网络" },
  { pattern: /balance|余额|quota|额度/i, message: "当前模型账户余额或额度不足" },
  { pattern: /too\s*large|尺寸|过大|exceed.*size/i, message: "图片尺寸过大，请压缩后再试" },
  { pattern: /network|fetch|ECONNREFUSED|无法连接/i, message: "无法连接 AI 后端，请确认服务已启动" },
  { pattern: /not\s*json|非\s*json/i, message: "接口返回格式异常，请查看后端日志" },
  { pattern: /provider|模型服务/i, message: "模型服务调用失败，请稍后重试" },
];

const CODE_MESSAGES: Record<string, string> = {
  PROVIDER_TIMEOUT: "AI 服务响应超时，请稍后重试",
  PROVIDER_ERROR: "模型服务调用失败，请稍后重试",
  OSS_UPLOAD_FAILED: "图片上传失败，请检查 OSS 配置",
  MISSING_API_KEY: "请先在后端配置模型 API 密钥",
  IMAGE_TOO_LARGE: "图片尺寸过大，请压缩后再试",
  INSUFFICIENT_BALANCE: "当前模型账户余额不足",
};

function matchKeywordHint(text: string): string | null {
  for (const { pattern, message } of KEYWORD_HINTS) {
    if (pattern.test(text)) return message;
  }
  return null;
}

function extractText(input: AiErrorInput): string {
  if (input == null) return "";
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message;
  const parts: string[] = [];
  if (input.code) parts.push(input.code);
  if (input.message) parts.push(input.message);
  if (input.reason) parts.push(input.reason);
  if (input.detail != null) {
    const d = formatApiDetail(input.detail);
    if (d) parts.push(d);
  }
  if (input.status != null) parts.push(`HTTP ${input.status}`);
  return parts.filter(Boolean).join(" ");
}

/**
 * 将后端/网络/业务错误转为面向用户的中文提示。
 */
export function normalizeAiError(
  input: AiErrorInput,
  fallback = "AI 请求失败，请稍后重试",
): string {
  if (input == null) return fallback;

  if (typeof input === "object" && !(input instanceof Error) && input.code) {
    const byCode = CODE_MESSAGES[input.code];
    if (byCode) return byCode;
  }

  const text = extractText(input).trim();
  if (!text) return fallback;

  const hint = matchKeywordHint(text);
  if (hint) return hint;

  if (text.length > 280) return `${text.slice(0, 280)}…`;
  return text;
}
