from __future__ import annotations

from typing import Any

from backend.app.core.settings import Settings
from backend.app.providers.payloads import build_gpt_image_payload
from backend.app.providers.response_parse import extract_image_url_from_chat_content
from backend.app.modules.generation.schemas import GenerateImageRequest
from backend.app.utils.http import post_json_with_retry

CHAT_ENDPOINT = "/v1/chat/completions"


class GptImageProvider:
    name = "gpt-image"
    models = ["gpt-image-2"]

    def generate(self, req: GenerateImageRequest, settings: Settings) -> tuple[str, Any, str]:
        model = req.model or self.models[0]
        payload = build_gpt_image_payload(req, model)
        api_key = settings.api_key_for_provider("gpt-image")
        base = settings.base_url_for_images_provider("gpt-image")
        body = post_json_with_retry(
            f"{base}{CHAT_ENDPOINT}",
            api_key,
            payload,
            timeout=120,
        )

        choices = body.get("choices") or []
        if not choices:
            raise RuntimeError(f"chat response missing choices: {body}")

        message = choices[0].get("message") or {}
        content = message.get("content", "")

        image_url = extract_image_url_from_chat_content(content)
        return image_url, body, model
