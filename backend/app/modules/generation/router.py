from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from backend.app.modules.generation.schemas import GenerateImageRequest, GenerateImageResponse
from backend.app.modules.generation.service import generation_service

log = logging.getLogger("ai_canvas.api")

router = APIRouter()


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


@router.post("/generate-image", response_model=GenerateImageResponse)
def generate_image_endpoint(req: GenerateImageRequest, request: Request) -> GenerateImageResponse:
    rid = _request_id(request)
    try:
        return generation_service.run_generate_image(req, rid)
    except Exception as e:
        log.exception(
            "generate_image endpoint error request_id=%s traceId=%s",
            rid,
            req.traceId,
        )
        raise HTTPException(status_code=500, detail=str(e)) from e
