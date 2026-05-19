from __future__ import annotations

import logging
from typing import Any

from backend.app.core.settings import Settings
from backend.app.providers.registry import provider_registry
from backend.app.modules.generation.schemas import GenerateImageRequest, GenerateImageResponse
from backend.app.modules.upload.service import UploadService
from backend.app.utils.image import calculate_ratio_from_image
from backend.app.utils.log_sanitize import sanitize_for_log, sanitize_generate_request

log = logging.getLogger("ai_canvas.generate")


def raw_for_json(raw: Any) -> Any:
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    return str(raw)


def resolve_response_mode(req: GenerateImageRequest) -> str:
    if req.mode:
        return req.mode
    if req.mask:
        return "inpaint"
    if req.image or (req.referenceImages and len(req.referenceImages) > 0):
        return "image-to-image"
    return "generate"


class GenerationService:
    """编排：归一化 URL → 选择 provider → 调用模型 → 组装响应。"""

    def __init__(self, settings: Settings, upload_service: UploadService):
        self._settings = settings
        self._upload = upload_service

    def normalize_request_images(
        self,
        req: GenerateImageRequest,
    ) -> tuple[GenerateImageRequest, dict[str, Any]]:
        trace_id = req.traceId or "default"
        client_id = req.clientId or "web"

        image_url = self._upload.ensure_url(
            req.image,
            trace_id=trace_id,
            api_name="source",
            client_id=client_id,
        )

        mask_url = self._upload.ensure_url(
            req.mask,
            trace_id=trace_id,
            api_name="mask",
            client_id=client_id,
        )

        ref_urls: list[str] = []
        for i, raw in enumerate(req.referenceImages or []):
            u = self._upload.ensure_url(
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

        uploaded = {
            "image": image_url,
            "mask": mask_url,
            "referenceImages": ref_urls,
        }
        return new_req, uploaded

    def resolve_request_ratio(self, req: GenerateImageRequest) -> GenerateImageRequest:
        """`ratio=auto` 时按参考图宽高匹配最接近的预设比例。"""
        ratio = (req.ratio or "").strip().lower()
        if ratio != "auto":
            return req
        if req.image:
            resolved = calculate_ratio_from_image(req.image)
            log.info("ratio auto resolved from image traceId=%s ratio=%s", req.traceId, resolved)
            return req.model_copy(update={"ratio": resolved})
        return req.model_copy(update={"ratio": "16x9"})

    def run_generate_image(
        self,
        req: GenerateImageRequest,
        request_id: str | None,
    ) -> GenerateImageResponse:
        log.info(
            "generate_image begin request_id=%s summary=%s",
            request_id,
            sanitize_generate_request(req),
        )
        try:
            normalized_req, uploaded = self.normalize_request_images(req)
            normalized_req = self.resolve_request_ratio(normalized_req)
            provider_impl = provider_registry.get(req.provider)
            url, raw, final_model = provider_impl.generate(normalized_req, self._settings)
        except Exception as e:
            log.exception(
                "generate_image failed request_id=%s traceId=%s err=%s",
                request_id,
                req.traceId,
                e,
            )
            raise

        raw_out = raw_for_json(raw) if self._settings.return_raw_response else None
        log.info(
            "generate_image ok request_id=%s traceId=%s model=%s mode=%s url=%s uploaded=%s",
            request_id,
            req.traceId,
            final_model,
            resolve_response_mode(normalized_req),
            url[:200] + ("…" if len(url) > 200 else ""),
            uploaded,
        )
        if raw_out is not None:
            log.debug("generate_image raw (sanitized)=%s", sanitize_for_log(raw_out))

        return GenerateImageResponse(
            url=url,
            provider=req.provider,
            model=final_model,
            mode=resolve_response_mode(normalized_req),
            raw=raw_out,
            uploaded=uploaded,
        )


from backend.app.core.settings import settings
from backend.app.modules.upload.service import upload_service

generation_service = GenerationService(settings, upload_service)
