"""各网关请求体构建（无 HTTP、无 OSS）。"""

from __future__ import annotations

from typing import Any

from backend.app.schemas.generation import GenerateImageRequest
from backend.app.utils.image import calculate_doubao_size_from_image


def _ordered_image_urls(req: GenerateImageRequest) -> list[str]:
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


def build_ksyun_payload(req: GenerateImageRequest, model: str) -> dict[str, Any]:
    k_prompt = req.prompt
    if req.referenceImages:
        urls = [u for u in req.referenceImages if u][:4]
        if urls:
            k_prompt += "。参考图：" + "；".join(urls)
    return {
        "model": model,
        "prompt": k_prompt,
        "image": req.image,
        "mask": req.mask,
        "response_format": "url",
        "size": req.size or req.ratio or "16x9",
        **(req.extra or {}),
    }
