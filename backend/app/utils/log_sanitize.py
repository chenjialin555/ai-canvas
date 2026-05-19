"""
脱敏 / 缩短日志中的大字段（data URL、长 prompt 等）。
"""

from __future__ import annotations

from typing import Any

from backend.app.modules.generation.schemas import GenerateImageRequest

_MAX_RECURSE = 10
_MAX_LIST_ITEMS = 25
_MAX_STR_INLINE = 220


def summarize_string(s: str) -> str:
    t = s.strip()
    if t.startswith("data:"):
        return f"<data URL {len(t)} chars>"
    if len(t) > _MAX_STR_INLINE:
        return t[:_MAX_STR_INLINE] + f"…(+{len(t) - _MAX_STR_INLINE} chars)"
    return t


def sanitize_for_log(obj: Any, depth: int = 0) -> Any:
    if depth > _MAX_RECURSE:
        return "<max depth>"
    if obj is None:
        return None
    if isinstance(obj, str):
        return summarize_string(obj)
    if isinstance(obj, (int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {str(k): sanitize_for_log(v, depth + 1) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        head = [sanitize_for_log(x, depth + 1) for x in obj[:_MAX_LIST_ITEMS]]
        if len(obj) > _MAX_LIST_ITEMS:
            head.append(f"…(+{len(obj) - _MAX_LIST_ITEMS} more items)")
        return head
    return str(obj)[:500]


def sanitize_generate_request(req: GenerateImageRequest) -> dict[str, Any]:
    p = req.prompt or ""
    prompt_preview = p[:800] + ("…" if len(p) > 800 else "")
    return {
        "provider": req.provider,
        "model": req.model,
        "prompt_len": len(p),
        "prompt_preview": prompt_preview,
        "image": summarize_string(req.image) if req.image else None,
        "mask": summarize_string(req.mask) if req.mask else None,
        "referenceImages_n": len(req.referenceImages or []),
        "mode": req.mode,
        "ratio": req.ratio,
        "resolution": req.resolution,
        "size": req.size,
        "seed": req.seed,
        "guidanceScale": req.guidanceScale,
        "watermark": req.watermark,
        "traceId": req.traceId,
        "clientId": req.clientId,
        "extra_keys": list((req.extra or {}).keys()) if req.extra else [],
    }
