from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

log = logging.getLogger("ai_canvas.http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = rid

        start = time.perf_counter()
        client = request.client.host if request.client else "?"
        log.info(
            "→ %s %s client=%s query=%s request_id=%s",
            request.method,
            request.url.path,
            client,
            dict(request.query_params) if request.query_params else {},
            rid,
        )

        try:
            response = await call_next(request)
        except Exception:
            ms = (time.perf_counter() - start) * 1000
            log.exception(
                "✗ %s %s request_id=%s duration_ms=%.1f (unhandled)",
                request.method,
                request.url.path,
                rid,
                ms,
            )
            raise

        ms = (time.perf_counter() - start) * 1000
        log.info(
            "← %s %s status=%s duration_ms=%.1f request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            ms,
            rid,
        )
        response.headers["X-Request-ID"] = rid
        return response
