from __future__ import annotations

import time
from typing import Any

import dashscope
from dashscope import MultiModalConversation

from backend.app.core.settings import Settings
from backend.app.modules.generation.schemas import GenerateImageRequest

MAX_RETRIES = 3


class QwenProvider:
    name = "qwen"
    models = [
        "qwen-image-edit-max",
        "qwen-image-edit",
        "qwen-image",
        "qwen-vl-max",
        "qwen-vl-plus",
    ]

    def generate(self, req: GenerateImageRequest, settings: Settings) -> tuple[str, Any, str]:
        api_key = settings.api_key_for_provider("qwen")
        model = req.model or self.models[0]

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
