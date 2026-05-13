from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ..providers import MODEL_PRESETS
from ..schemas import GenerateImageRequest, GenerateImageResponse, UploadImageURLRequest
from ..services.generation import run_generate_image
from ..services.upload import run_upload_image_url

log = logging.getLogger("ai_canvas.api")

router = APIRouter(prefix="/api", tags=["api"])


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


@router.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "ai-canvas-python-backend",
    }


@router.get("/models")
def models() -> dict[str, dict[str, list[str]]]:
    return {
        provider: {"models": preset["models"]}
        for provider, preset in MODEL_PRESETS.items()
    }


@router.post("/upload-image-url")
def upload_image_url(req: UploadImageURLRequest, request: Request) -> dict[str, str]:
    rid = _request_id(request)
    try:
        return run_upload_image_url(req, rid)
    except Exception as e:
        log.exception("upload_image_url endpoint error request_id=%s", rid)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/generate-image", response_model=GenerateImageResponse)
def generate_image_endpoint(req: GenerateImageRequest, request: Request) -> GenerateImageResponse:
    rid = _request_id(request)
    try:
        return run_generate_image(req, rid)
    except Exception as e:
        log.exception("generate_image endpoint error request_id=%s traceId=%s", rid, req.traceId)
        raise HTTPException(status_code=500, detail=str(e)) from e
