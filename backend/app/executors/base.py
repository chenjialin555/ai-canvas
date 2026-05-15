from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseNodeExecutor(ABC):
    node_type: str

    @abstractmethod
    def run(
        self,
        *,
        inputs: dict[str, Any],
        params: dict[str, Any],
        trace_id: str,
    ) -> dict[str, Any]:
        """返回 outputs 字典（如 result -> image ref）。"""
