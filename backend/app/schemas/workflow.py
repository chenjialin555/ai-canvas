from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class RunNodeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nodeType: str
    inputs: dict[str, Any]
    params: dict[str, Any] = Field(default_factory=dict)
    traceId: Optional[str] = "default"


class RunNodeResponse(BaseModel):
    outputs: dict[str, Any]
    raw: Any | None = None
