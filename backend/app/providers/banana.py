from __future__ import annotations

from typing import Any

from backend.app.core.settings import Settings
from backend.app.providers.payloads import build_banana_payload
from backend.app.providers.response_parse import extract_image_url_from_images_response
from backend.app.schemas.generation import GenerateImageRequest
from backend.app.utils.http import post_json_with_retry

IMAGES_ENDPOINT = "/v1/images/generations"


class BananaProvider:
    name = "banana"
    models = [
        "nano-banana-2-2k",
        "gemini-3.1-flash-image-preview-2k",
        "gemini-3.1-flash-image-preview-4k",
        "nano-banana-pro",
        "nano-banana-pro-2k",
    ]

    def generate(self, req: GenerateImageRequest, settings: Settings) -> tuple[str, Any, str]:
        model = req.model or self.models[0]
        payload = build_banana_payload(req, model)
        api_key = settings.api_key_for_provider("banana")
        base = settings.base_url_for_images_provider("banana")
        body = post_json_with_retry(
            f"{base}{IMAGES_ENDPOINT}",
            api_key,
            payload,
            timeout=500,
        )
        url = extract_image_url_from_images_response(body)
        return url, body, model
