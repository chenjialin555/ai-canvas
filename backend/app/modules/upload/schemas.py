from __future__ import annotations

from pydantic import BaseModel


class UploadImageURLRequest(BaseModel):
    dataUrl: str
    traceId: str | None = "manual"
    clientId: str | None = "web"
    apiName: str | None = "upload"
