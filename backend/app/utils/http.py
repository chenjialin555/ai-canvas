from __future__ import annotations

import logging
import time
from typing import Any, Optional

import httpx

from backend.app.utils.log_sanitize import sanitize_for_log

MAX_RETRIES = 3
RETRY_DELAY = 2.0


def should_retry(error: Exception) -> bool:
    if isinstance(
        error,
        (
            httpx.NetworkError,
            httpx.TimeoutException,
            httpx.ConnectError,
            httpx.RemoteProtocolError,
        ),
    ):
        return True

    if isinstance(error, httpx.HTTPStatusError):
        code = error.response.status_code
        return code >= 500 or code == 429

    return False


def post_json_with_retry(
    url: str,
    api_key: str,
    payload: dict[str, Any],
    *,
    timeout: float = 500,
    max_retries: int = MAX_RETRIES,
    retry_delay: float = RETRY_DELAY,
) -> dict[str, Any]:
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 2):
        try:
            with httpx.Client(timeout=timeout) as cli:
                resp = cli.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

                if resp.status_code >= 400:
                    try:
                        error_body = resp.json()
                    except Exception:
                        error_body = resp.text

                    logging.error("API error status=%s", resp.status_code)
                    logging.error("Request payload (sanitized)=%s", sanitize_for_log(payload))
                    logging.error("Response (sanitized)=%s", sanitize_for_log(error_body))

                resp.raise_for_status()
                return resp.json()

        except Exception as e:
            last_error = e

            if attempt > max_retries or not should_retry(e):
                raise RuntimeError(f"API call failed: {e}") from e

            wait_time = retry_delay * attempt
            logging.warning(
                "API call failed attempt=%s/%s, retry in %ss: %s",
                attempt,
                max_retries + 1,
                wait_time,
                e,
            )
            time.sleep(wait_time)

    raise RuntimeError(f"API call failed: {last_error}") from last_error
