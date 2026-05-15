from __future__ import annotations

from fastapi import APIRouter

from backend.app.api.v1 import generation, models, upload, workflow

api_router = APIRouter()

api_router.include_router(models.router, tags=["meta"])
api_router.include_router(generation.router, tags=["generation"])
api_router.include_router(upload.router, tags=["upload"])
api_router.include_router(workflow.router, tags=["workflow"])
