from __future__ import annotations

from fastapi import APIRouter

from backend.app.modules.generation.router import router as generation_router
from backend.app.modules.models.router import router as models_router
from backend.app.modules.upload.router import router as upload_router
from backend.app.modules.workflow.router import router as workflow_router

api_router = APIRouter()

api_router.include_router(models_router, tags=["meta"])
api_router.include_router(generation_router, tags=["generation"])
api_router.include_router(upload_router, tags=["upload"])
api_router.include_router(workflow_router, tags=["workflow"])
