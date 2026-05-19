from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.common import Provider


class GenerateImageRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider: Provider = "banana"
    model: Optional[str] = None

    prompt: str

    image: Optional[str] = None
    mask: Optional[str] = None

    referenceImages: Optional[list[str]] = Field(default=None, alias="referenceImages")

    mode: Optional[str] = None

    ratio: Optional[str] = "16x9"
    resolution: Optional[str] = "1K"

    size: Optional[str] = None
    seed: Optional[int] = None
    guidanceScale: Optional[float] = Field(default=None, alias="guidanceScale")
    watermark: bool = False

    traceId: Optional[str] = "default"
    clientId: Optional[str] = "web"

    extra: Optional[dict[str, Any]] = None


class GenerateImageResponse(BaseModel):
    url: str
    provider: str
    model: str
    mode: str
    raw: Any | None = None
    uploaded: dict[str, Any] | None = None
