from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from backend.app.providers.registry import provider_registry

router = APIRouter()


@router.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "ai-canvas-python-backend",
    }


@router.get("/models")
def models() -> dict[str, dict[str, list[str]]]:
    return provider_registry.get_model_map()
