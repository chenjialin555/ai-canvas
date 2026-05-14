from __future__ import annotations

from backend.app.providers.base import ImageGenerationProvider
from backend.app.providers.banana import BananaProvider
from backend.app.providers.doubao import DoubaoProvider
from backend.app.providers.flux import FluxProvider
from backend.app.providers.gemini import GeminiProvider
from backend.app.providers.gpt_image import GptImageProvider
from backend.app.providers.ksyun import KsyunProvider
from backend.app.providers.qwen import QwenProvider


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, ImageGenerationProvider] = {
            "banana": BananaProvider(),
            "gemini": GeminiProvider(),
            "doubao": DoubaoProvider(),
            "flux": FluxProvider(),
            "ksyun": KsyunProvider(),
            "gpt-image": GptImageProvider(),
            "qwen": QwenProvider(),
        }

    def get(self, name: str) -> ImageGenerationProvider:
        p = self._providers.get(name)
        if not p:
            raise ValueError(f"Unsupported provider: {name}")
        return p

    def get_model_map(self) -> dict[str, dict[str, list[str]]]:
        return {
            name: {"models": list(provider.models)}
            for name, provider in self._providers.items()
        }


provider_registry = ProviderRegistry()
