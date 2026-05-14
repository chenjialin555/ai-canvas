"""OpenAI-style images API 响应解析。"""

from __future__ import annotations

import re
from typing import Any


def extract_image_url_from_chat_content(content: str) -> str:
    if not content:
        raise RuntimeError("chat response content is empty")

    md_match = re.search(r"!\[[^\]]*\]\((https?://[^)]+)\)", content)
    if md_match:
        return md_match.group(1).strip()

    url_match = re.search(r"(https?://\S+)", content)
    if url_match:
        return url_match.group(1).strip().rstrip(")")

    data_match = re.search(r"(data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+)", content)
    if data_match:
        return data_match.group(1).strip()

    raise RuntimeError(f"Cannot parse image url from content: {content[:300]}")


def extract_image_url_from_images_response(body: dict[str, Any]) -> str:
    if isinstance(body.get("data"), list) and body["data"]:
        first = body["data"][0]

        if first.get("url"):
            return first["url"]

        if first.get("b64_json"):
            return f"data:image/png;base64,{first['b64_json']}"

    if body.get("url"):
        return body["url"]

    raise RuntimeError(f"API response has no image url: {body}")
