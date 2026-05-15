from __future__ import annotations

from typing import Any, cast

from backend.app.executors.base import BaseNodeExecutor


def _first_image_payload(inp: Any) -> dict[str, Any] | None:
    if not isinstance(inp, dict):
        return None
    url = inp.get("url") or inp.get("dataURL")
    if not url:
        return None
    return {
        "type": "image",
        "url": str(url),
        "width": inp.get("width"),
        "height": inp.get("height"),
    }


def _pick_image_input(
    inputs: dict[str, Any], keys: tuple[str, ...]
) -> dict[str, Any] | None:
    for k in keys:
        v = inputs.get(k)
        p = _first_image_payload(v)
        if p:
            return p
    return None


class InpaintExecutor(BaseNodeExecutor):
    node_type = "inpaint"

    def run(
        self,
        *,
        inputs: dict[str, Any],
        params: dict[str, Any],
        trace_id: str,
    ) -> dict[str, Any]:
        image = cast(dict[str, Any], inputs.get("image") or {})
        url = str(image.get("url") or image.get("dataURL") or "")
        if not url:
            raise ValueError("局部重绘缺少 image 输入或 url")
        return {
            "result": {
                "type": "image",
                "url": url,
                "width": image.get("width"),
                "height": image.get("height"),
            }
        }


class StyleTransferExecutor(BaseNodeExecutor):
    node_type = "style-transfer"

    def run(
        self,
        *,
        inputs: dict[str, Any],
        params: dict[str, Any],
        trace_id: str,
    ) -> dict[str, Any]:
        content = cast(dict[str, Any], inputs.get("contentImage") or {})
        url = str(content.get("url") or content.get("dataURL") or "")
        if not url:
            raise ValueError("风格迁移缺少 contentImage 或 url")
        return {
            "result": {
                "type": "image",
                "url": url,
                "width": content.get("width"),
                "height": content.get("height"),
            }
        }


class PassthroughImageExecutor(BaseNodeExecutor):
    """占位：从常见 image 输入键取第一张图并原样返回为 result。"""

    def __init__(self, node_type: str, input_keys: tuple[str, ...]) -> None:
        self.node_type = node_type
        self._input_keys = input_keys

    def run(
        self,
        *,
        inputs: dict[str, Any],
        params: dict[str, Any],
        trace_id: str,
    ) -> dict[str, Any]:
        p = _pick_image_input(inputs, self._input_keys)
        if not p:
            raise ValueError(f"{self.node_type}: 未找到可用的 image 输入")
        return {"result": p}
