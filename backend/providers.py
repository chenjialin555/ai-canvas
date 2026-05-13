import logging
import os
import re
import time
from typing import Any, Optional

import dashscope
import httpx
from dashscope import MultiModalConversation

from .image_utils import calculate_doubao_size_from_image
from .log_sanitize import sanitize_for_log
from .oss_uploader import ensure_url
from .schemas import GenerateImageRequest


MAX_RETRIES = 3
RETRY_DELAY = 2.0
REQUEST_TIMEOUT = 500

COMFLY_BASE_URL = os.getenv("COMFLY_BASE_URL", "https://ai.comfly.chat").rstrip("/")


MODEL_PRESETS: dict[str, dict[str, Any]] = {
    "banana": {
        "api_key_env": "BANANA_API_KEY",
        "base_url_env": "COMFLY_BASE_URL",
        "endpoint": "/v1/images/generations",
        "models": [
            "nano-banana-2-2k",
            "gemini-3.1-flash-image-preview-2k",
            "gemini-3.1-flash-image-preview-4k",
            "nano-banana-pro",
            "nano-banana-pro-2k",
        ],
    },
    "gemini": {
        "api_key_env": "GEMINI_API_KEY",
        "base_url_env": "GEMINI_BASE_URL",
        "endpoint": "/v1/images/generations",
        "models": [
            "gemini-3.1-flash-image-preview-2k",
            "gemini-3.1-flash-image-preview-4k",
        ],
    },
    "doubao": {
        "api_key_env": "DOUBAO_API_KEY",
        "base_url_env": "COMFLY_BASE_URL",
        "endpoint": "/v1/images/generations",
        "models": [
            "doubao-seedream-5-0-260128",
            "doubao-seedream-4-5-251128",
            "doubao-seededit-3-0-i2i-250628",
        ],
    },
    "gpt-image": {
        "api_key_env": "GEMINI_API_KEY",
        "base_url_env": "COMFLY_BASE_URL",
        "endpoint": "/v1/chat/completions",
        "models": [
            "gpt-image-2",
        ],
    },
    "qwen": {
        "api_key_env": "QWEN_API_KEY",
        "base_url_env": None,
        "endpoint": None,
        "models": [
            "qwen-image-edit-max",
            "qwen-image-edit",
            "qwen-image",
            "qwen-vl-max",
            "qwen-vl-plus",
        ],
    },
    "flux": {
        "api_key_env": "FLUX_API_KEY",
        "base_url_env": "COMFLY_BASE_URL",
        "endpoint": "/v1/images/generations",
        "models": [
            "flux-kontext-pro",
            "flux-kontext-max",
            "flux-1.1-pro",
            "flux-dev",
        ],
    },
    "ksyun": {
        "api_key_env": "KSYUN_API_KEY",
        "base_url_env": "KSYUN_BASE_URL",
        "endpoint": "/v1/images/generations",
        "models": [
            "ksyun-image",
            "ksyun-image-edit",
        ],
    },
}


def get_api_key(provider: str) -> str:
    preset = MODEL_PRESETS.get(provider)

    if not preset:
        raise ValueError(f"Unsupported provider: {provider}")

    key = os.getenv(preset["api_key_env"], "")

    if not key:
        raise RuntimeError(f"Missing env: {preset['api_key_env']}")

    return key


def get_base_url(provider: str) -> str:
    preset = MODEL_PRESETS[provider]
    env_name = preset.get("base_url_env")

    if not env_name:
        return ""

    raw = os.getenv(env_name, COMFLY_BASE_URL)

    if not raw.startswith("http://") and not raw.startswith("https://"):
        raw = "https://" + raw

    return raw.rstrip("/")


def should_retry(error: Exception) -> bool:
    if isinstance(
        error,
        (
            httpx.NetworkError,
            httpx.TimeoutException,
            httpx.ConnectError,
            httpx.RemoteProtocolError,
        ),
    ):
        return True

    if isinstance(error, httpx.HTTPStatusError):
        code = error.response.status_code
        return code >= 500 or code == 429

    return False


def extract_image_url_from_chat_content(content: str) -> str:
    if not content:
        raise RuntimeError("chat response content is empty")

    md_match = re.search(r"!\[[^\]]*\]\((https?://[^)]+)\)", content)
    if md_match:
        return md_match.group(1).strip()

    url_match = re.search(r"(https?://\S+)", content)
    if url_match:
        return url_match.group(1).strip().rstrip(")")

    data_match = re.search(r"(data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+)", content)
    if data_match:
        return data_match.group(1).strip()

    raise RuntimeError(f"Cannot parse image url from content: {content[:300]}")


def extract_image_url_from_images_response(body: dict[str, Any]) -> str:
    if isinstance(body.get("data"), list) and body["data"]:
        first = body["data"][0]

        if first.get("url"):
            return first["url"]

        if first.get("b64_json"):
            return f"data:image/png;base64,{first['b64_json']}"

    if body.get("url"):
        return body["url"]

    raise RuntimeError(f"API response has no image url: {body}")


def post_with_retry(
    url: str,
    api_key: str,
    payload: dict[str, Any],
    timeout: int = REQUEST_TIMEOUT,
) -> dict[str, Any]:
    last_error: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 2):
        try:
            with httpx.Client(timeout=timeout) as cli:
                resp = cli.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

                if resp.status_code >= 400:
                    try:
                        error_body = resp.json()
                    except Exception:
                        error_body = resp.text

                    logging.error("API error status=%s", resp.status_code)
                    logging.error("Request payload (sanitized)=%s", sanitize_for_log(payload))
                    logging.error("Response (sanitized)=%s", sanitize_for_log(error_body))

                resp.raise_for_status()
                return resp.json()

        except Exception as e:
            last_error = e

            if attempt > MAX_RETRIES or not should_retry(e):
                raise RuntimeError(f"API call failed: {e}") from e

            wait_time = RETRY_DELAY * attempt
            logging.warning(
                "API call failed attempt=%s/%s, retry in %ss: %s",
                attempt,
                MAX_RETRIES + 1,
                wait_time,
                e,
            )
            time.sleep(wait_time)

    raise RuntimeError(f"API call failed: {last_error}") from last_error


def _ordered_image_urls(req: GenerateImageRequest) -> list[str]:
    """主图、参考图、蒙版按顺序去重拼接（蒙版始终在末尾）。"""
    seen: set[str] = set()
    out: list[str] = []
    for u in (
        [req.image]
        + list(req.referenceImages or [])
        + ([req.mask] if req.mask else [])
    ):
        if not u or u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def _mask_hint_segment(req: GenerateImageRequest, url_count: int) -> str:
    if not req.mask:
        return ""
    if url_count <= 2:
        return "，第二张图是蒙版，只修改蒙版标记区域"
    return "，最后一张图是蒙版，只修改蒙版标记区域"


def build_banana_payload(req: GenerateImageRequest, model: str) -> dict[str, Any]:
    image_urls = _ordered_image_urls(req)
    ratio = req.ratio or "1x1"

    return {
        "model": model,
        "size": ratio,
        "n": 1,
        "prompt": (
            f"{req.prompt}"
            f"{_mask_hint_segment(req, len(image_urls))}"
            ",output to image"
        ),
        "resolution": req.resolution or "1K",
        "image_urls": image_urls,
    }


def build_doubao_payload(req: GenerateImageRequest, model: str) -> dict[str, Any]:
    prompt = req.prompt

    if req.referenceImages:
        urls = [u for u in req.referenceImages if u][:6]
        if urls:
            prompt += "。附加参考图 URL（按顺序）：" + "；".join(urls)

    if req.mask:
        prompt += "。参考蒙版图，只修改蒙版标记区域，保持其他区域不变。"

    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "response_format": "url",
        "watermark": bool(req.watermark),
    }

    if req.image:
        payload["image"] = req.image

    if req.size:
        payload["size"] = req.size
    elif req.image:
        payload["size"] = calculate_doubao_size_from_image(req.image)

    if req.seed is not None:
        payload["seed"] = req.seed

    if req.guidanceScale is not None:
        payload["guidance_scale"] = req.guidanceScale

    if req.mask:
        payload["mask"] = req.mask

    return payload


def build_gpt_image_payload(req: GenerateImageRequest, model: str) -> dict[str, Any]:
    img_parts = [req.image] + list(req.referenceImages or []) + ([req.mask] if req.mask else [])
    n_imgs = sum(1 for u in img_parts if u)
    mask_note = ""
    if req.mask:
        mask_note = (
            "第二张图是蒙版，请只编辑蒙版区域。"
            if n_imgs <= 2
            else "最后一张图是蒙版，请只编辑蒙版区域。"
        )

    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                f"{req.prompt}\n\n"
                f"{mask_note}"
            ),
        }
    ]

    if req.image:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": req.image},
            }
        )

    for u in req.referenceImages or []:
        if u:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": u},
                }
            )

    if req.mask:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": req.mask},
            }
        )

    return {
        "model": model,
        "stream": False,
        "messages": [
            {
                "role": "user",
                "content": content,
            }
        ],
    }


def build_flux_payload(req: GenerateImageRequest, model: str) -> dict[str, Any]:
    image_urls = _ordered_image_urls(req)

    return {
        "model": model,
        "prompt": (
            f"{req.prompt}"
            f"{'。第二张图是蒙版，只编辑蒙版区域。' if req.mask and len(image_urls) <= 2 else ''}"
            f"{'。最后一张图是蒙版，只编辑蒙版区域。' if req.mask and len(image_urls) > 2 else ''}"
        ),
        "response_format": "url",
        "size": req.ratio or "16x9",
        "resolution": req.resolution or "1K",
        "image_urls": image_urls,
    }


def call_images_generation_provider(
    provider: str,
    req: GenerateImageRequest,
) -> tuple[str, dict[str, Any], str]:
    preset = MODEL_PRESETS[provider]
    api_key = get_api_key(provider)
    base_url = get_base_url(provider)
    endpoint = preset["endpoint"]

    model = req.model or preset["models"][0]

    if provider in ("banana", "gemini"):
        payload = build_banana_payload(req, model)
    elif provider == "doubao":
        payload = build_doubao_payload(req, model)
    elif provider == "flux":
        payload = build_flux_payload(req, model)
    elif provider == "ksyun":
        k_prompt = req.prompt
        if req.referenceImages:
            urls = [u for u in req.referenceImages if u][:4]
            if urls:
                k_prompt += "。参考图：" + "；".join(urls)
        payload = {
            "model": model,
            "prompt": k_prompt,
            "image": req.image,
            "mask": req.mask,
            "response_format": "url",
            "size": req.size or req.ratio or "16x9",
            **(req.extra or {}),
        }
    else:
        raise ValueError(f"Invalid images provider: {provider}")

    body = post_with_retry(
        url=f"{base_url}{endpoint}",
        api_key=api_key,
        payload=payload,
        timeout=REQUEST_TIMEOUT,
    )

    image_url = extract_image_url_from_images_response(body)

    return image_url, body, model


def call_chat_completion_provider(
    provider: str,
    req: GenerateImageRequest,
) -> tuple[str, dict[str, Any], str]:
    preset = MODEL_PRESETS[provider]
    api_key = get_api_key(provider)
    base_url = get_base_url(provider)
    endpoint = preset["endpoint"]

    model = req.model or preset["models"][0]

    payload = build_gpt_image_payload(req, model)

    body = post_with_retry(
        url=f"{base_url}{endpoint}",
        api_key=api_key,
        payload=payload,
        timeout=120,
    )

    choices = body.get("choices") or []
    if not choices:
        raise RuntimeError(f"chat response missing choices: {body}")

    message = choices[0].get("message") or {}
    content = message.get("content", "")

    image_url = extract_image_url_from_chat_content(content)

    return image_url, body, model


def call_qwen(req: GenerateImageRequest) -> tuple[str, Any, str]:
    api_key = get_api_key("qwen")
    model = req.model or MODEL_PRESETS["qwen"]["models"][0]

    dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"

    content: list[dict[str, str]] = []

    if req.image:
        content.append({"image": req.image})

    for u in req.referenceImages or []:
        if u:
            content.append({"image": u})

    if req.mask:
        content.append({"image": req.mask})

    n_imgs = sum(1 for x in content if "image" in x)
    mask_suffix = ""
    if req.mask:
        mask_suffix = (
            "。第二张图是蒙版，请只编辑蒙版区域。"
            if n_imgs <= 2
            else "。最后一张图是蒙版，请只编辑蒙版区域。"
        )

    content.append(
        {
            "text": (
                f"{req.prompt}"
                f"{mask_suffix}"
            )
        }
    )

    messages = [
        {
            "role": "user",
            "content": content,
        }
    ]

    last_error: Any = None

    for attempt in range(MAX_RETRIES + 2):
        try:
            response = MultiModalConversation.call(
                api_key=api_key,
                model=model,
                messages=messages,
                stream=False,
                watermark=False,
                negative_prompt=" ",
            )

            if response.status_code == 200:
                result_content = response.output.choices[0].message.content[0]

                if isinstance(result_content, dict) and "image" in result_content:
                    url = result_content["image"]
                    if url:
                        return url, response, model

                if isinstance(result_content, str) and result_content.strip():
                    return result_content.strip(), response, model

                raise RuntimeError(f"Qwen response has no image: {response}")

            last_error = response

            if response.status_code == 429 and attempt <= MAX_RETRIES:
                time.sleep(2 ** (attempt + 1))
                continue

            if 400 <= response.status_code < 500:
                raise RuntimeError(
                    f"Qwen API error status={response.status_code}, "
                    f"code={getattr(response, 'code', '')}, "
                    f"message={getattr(response, 'message', '')}"
                )

            if attempt <= MAX_RETRIES:
                time.sleep(attempt + 1)
                continue

        except Exception as e:
            last_error = e

            if attempt > MAX_RETRIES:
                break

            time.sleep(attempt + 1)

    raise RuntimeError(f"Qwen API failed: {last_error}")


def normalize_request_images(
    req: GenerateImageRequest,
) -> tuple[GenerateImageRequest, dict[str, Any]]:
    """
    将 data:image/base64 上传 OSS，转换为公网 URL。
    """
    trace_id = req.traceId or "default"
    client_id = req.clientId or "web"

    image_url = ensure_url(
        req.image,
        trace_id=trace_id,
        api_name="source",
        client_id=client_id,
    )

    mask_url = ensure_url(
        req.mask,
        trace_id=trace_id,
        api_name="mask",
        client_id=client_id,
    )

    ref_urls: list[str] = []
    for i, raw in enumerate(req.referenceImages or []):
        u = ensure_url(
            raw,
            trace_id=trace_id,
            api_name=f"ref{i}",
            client_id=client_id,
        )
        if u:
            ref_urls.append(u)

    new_req = req.model_copy(
        update={
            "image": image_url,
            "mask": mask_url,
            "referenceImages": ref_urls,
        }
    )

    return new_req, {
        "image": image_url,
        "mask": mask_url,
        "referenceImages": ref_urls,
    }


def resolve_response_mode(req: GenerateImageRequest) -> str:
    if req.mode:
        return req.mode
    if req.mask:
        return "inpaint"
    if req.image or (req.referenceImages and len(req.referenceImages) > 0):
        return "image-to-image"
    return "generate"


def raw_for_json(raw: Any) -> Any:
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    return str(raw)


def generate_image(
    req: GenerateImageRequest,
) -> tuple[str, Any, str, dict[str, Any]]:
    provider = req.provider

    normalized_req, uploaded = normalize_request_images(req)

    if provider in ("banana", "gemini", "doubao", "flux", "ksyun"):
        url, raw, model = call_images_generation_provider(provider, normalized_req)
        return url, raw_for_json(raw), model, uploaded

    if provider == "gpt-image":
        url, raw, model = call_chat_completion_provider(provider, normalized_req)
        return url, raw_for_json(raw), model, uploaded

    if provider == "qwen":
        url, raw, model = call_qwen(normalized_req)
        return url, raw_for_json(raw), model, uploaded

    raise ValueError(f"Unsupported provider: {provider}")
