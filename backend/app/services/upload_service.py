from __future__ import annotations

import logging

from backend.app.core.settings import Settings
from backend.app.storage.oss import ensure_url as oss_ensure_url
from backend.app.schemas.upload import UploadImageURLRequest

log = logging.getLogger("ai_canvas.upload")


class UploadService:
    """上传编排：仅委托 storage，不关心模型。"""

    def __init__(self, settings: Settings):
        self._settings = settings

    def ensure_url(
        self,
        value: str | None,
        *,
        trace_id: str = "default",
        api_name: str = "image",
        client_id: str = "web",
    ) -> str | None:
        return oss_ensure_url(
            value,
            settings=self._settings,
            trace_id=trace_id,
            api_name=api_name,
            client_id=client_id,
        )

    def run_upload_image_url(
        self,
        req: UploadImageURLRequest,
        request_id: str | None,
    ) -> dict[str, str]:
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
            url = self.ensure_url(
                req.dataUrl,
                trace_id=req.traceId or "manual",
                api_name=req.apiName or "upload",
                client_id=req.clientId or "web",
            )
        except Exception:
            log.exception("upload_image_url failed request_id=%s", request_id)
            raise

        if not url:
            raise RuntimeError("upload failed: empty url")

        log.info(
            "upload_image_url ok request_id=%s traceId=%s url=%s",
            request_id,
            req.traceId,
            url[:200] + ("…" if len(url) > 200 else ""),
        )
        return {"url": url}
