from __future__ import annotations

from typing import Any

from backend.app.executors.base import BaseNodeExecutor
from backend.app.executors.image_nodes import (
    InpaintExecutor,
    PassthroughImageExecutor,
    StyleTransferExecutor,
)


class ExecutorRegistry:
    """按前端 workflow node `type` 路由执行器。"""

    def __init__(self) -> None:
        self._by_node_type: dict[str, BaseNodeExecutor] = {
            "inpaint": InpaintExecutor(),
            "style-transfer": StyleTransferExecutor(),
            "upscale": PassthroughImageExecutor("upscale", ("image", "contentImage")),
            "outpaint": PassthroughImageExecutor("outpaint", ("image", "contentImage")),
        }

    def get_for_node_type(self, node_type: str) -> BaseNodeExecutor:
        ex = self._by_node_type.get(node_type)
        if not ex:
            raise ValueError(f"Unsupported workflow nodeType: {node_type}")
        return ex


executor_registry = ExecutorRegistry()
