from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


Provider = Literal[
    "banana",
    "doubao",
    "gemini",
    "flux",
    "qwen",
    "gpt-image",
    "ksyun",
]


class GenerateImageRequest(BaseModel):
    provider: Provider = "banana"
    model: Optional[str] = None

    prompt: str

    # 可以是 http(s) URL，也可以是 data:image/base64
    image: Optional[str] = None

    # 可以是 http(s) URL，也可以是 data:image/base64
    mask: Optional[str] = None

    # 额外参考图（多图，与 image 一起传给支持多 URL 的网关；已做 OSS 归一化）
    referenceImages: Optional[list[str]] = Field(default=None, alias="referenceImages")

    mode: Optional[str] = None

    # Banana / Gemini / Flux 常用
    ratio: Optional[str] = "16x9"
    resolution: Optional[str] = "1K"

    # Doubao 常用
    size: Optional[str] = None
    seed: Optional[int] = None
    guidanceScale: Optional[float] = Field(default=None, alias="guidanceScale")
    watermark: bool = False

    # 用于 OSS 路径追踪
    traceId: Optional[str] = "default"
    clientId: Optional[str] = "web"

    # 预留扩展参数
    extra: Optional[dict[str, Any]] = None


class GenerateImageResponse(BaseModel):
    url: str
    provider: str
    model: str
    mode: str
    raw: Any | None = None

    # 返回后端上传后的 image / mask URL，方便调试（referenceImages 为 URL 列表）
    uploaded: dict[str, Any] | None = None


class UploadImageURLRequest(BaseModel):
    dataUrl: str
    traceId: str | None = "manual"
    clientId: str | None = "web"
    apiName: str | None = "upload"
