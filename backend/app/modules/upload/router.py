from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from backend.app.modules.upload.schemas import UploadImageURLRequest
from backend.app.modules.upload.service import upload_service

log = logging.getLogger("ai_canvas.api")

router = APIRouter()


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


@router.post("/upload-image-url")
def upload_image_url(req: UploadImageURLRequest, request: Request) -> dict[str, str]:
    rid = _request_id(request)
    try:
        return upload_service.run_upload_image_url(req, rid)
    except Exception as e:
        log.exception("upload_image_url endpoint error request_id=%s", rid)
        raise HTTPException(status_code=500, detail=str(e)) from e
