from __future__ import annotations

from typing import Any

from backend.app.core.settings import Settings
from backend.app.providers.payloads import build_flux_payload
from backend.app.providers.response_parse import extract_image_url_from_images_response
from backend.app.schemas.generation import GenerateImageRequest
from backend.app.utils.http import post_json_with_retry

IMAGES_ENDPOINT = "/v1/images/generations"


class FluxProvider:
    name = "flux"
    models = [
        "flux-kontext-pro",
        "flux-kontext-max",
        "flux-1.1-pro",
        "flux-dev",
    ]

    def generate(self, req: GenerateImageRequest, settings: Settings) -> tuple[str, Any, str]:
        model = req.model or self.models[0]
        payload = build_flux_payload(req, model)
        api_key = settings.api_key_for_provider("flux")
        base = settings.base_url_for_images_provider("flux")
        body = post_json_with_retry(
            f"{base}{IMAGES_ENDPOINT}",
            api_key,
            payload,
            timeout=500,
        )
        url = extract_image_url_from_images_response(body)
        return url, body, model
