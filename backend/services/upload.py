from __future__ import annotations

import logging

from ..oss_uploader import ensure_url
from ..schemas import UploadImageURLRequest

log = logging.getLogger("ai_canvas.upload")


def run_upload_image_url(req: UploadImageURLRequest, request_id: str | None) -> dict[str, str]:
    data = req.dataUrl or ""
    preview = data[:120] + "…" if len(data) > 120 else data
    log.info(
        "upload_image_url begin request_id=%s traceId=%s dataUrl_preview=%s len=%s",
        request_id,
        req.traceId,
        preview,
        len(data),
    )
    try:
        url = ensure_url(
            req.dataUrl,
            trace_id=req.traceId or "manual",
            api_name=req.apiName or "upload",
            client_id=req.clientId or "web",
        )
    except Exception:
        log.exception("upload_image_url failed request_id=%s", request_id)
        raise

    log.info(
        "upload_image_url ok request_id=%s traceId=%s url=%s",
        request_id,
        req.traceId,
        url[:200] + ("…" if len(url) > 200 else ""),
    )
    return {"url": url}
