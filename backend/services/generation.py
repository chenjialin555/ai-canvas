from __future__ import annotations

import logging

from ..config import return_raw_response
from ..log_sanitize import sanitize_for_log, sanitize_generate_request
from ..providers import generate_image, resolve_response_mode
from ..schemas import GenerateImageRequest, GenerateImageResponse

log = logging.getLogger("ai_canvas.generate")


def run_generate_image(req: GenerateImageRequest, request_id: str | None) -> GenerateImageResponse:
    log.info(
        "generate_image begin request_id=%s summary=%s",
        request_id,
        sanitize_generate_request(req),
    )
    try:
        url, raw, final_model, uploaded = generate_image(req)
    except Exception as e:
        log.exception(
            "generate_image failed request_id=%s traceId=%s err=%s",
            request_id,
            req.traceId,
            e,
        )
        raise

    raw_out = raw if return_raw_response() else None
    log.info(
        "generate_image ok request_id=%s traceId=%s model=%s mode=%s url=%s uploaded=%s",
        request_id,
        req.traceId,
        final_model,
        resolve_response_mode(req),
        url[:200] + ("…" if len(url) > 200 else ""),
        uploaded,
    )
    if raw_out is not None:
        log.debug("generate_image raw (sanitized)=%s", sanitize_for_log(raw_out))

    return GenerateImageResponse(
        url=url,
        provider=req.provider,
        model=final_model,
        mode=resolve_response_mode(req),
        raw=raw_out,
        uploaded=uploaded,
    )
