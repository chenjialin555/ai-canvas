from __future__ import annotations

from typing import Any, Protocol

from backend.app.core.settings import Settings
from backend.app.schemas.generation import GenerateImageRequest


class ImageGenerationProvider(Protocol):
    """各供应商实现：构建 payload、调用远端、返回 (url, raw, model)。"""

    name: str
    models: list[str]

    def generate(
        self,
        req: GenerateImageRequest,
        settings: Settings,
    ) -> tuple[str, Any, str]:
        ...
