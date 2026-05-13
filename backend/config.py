"""
应用配置（环境变量），不引入额外依赖。
"""

from __future__ import annotations

import os
from pathlib import Path


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def log_dir() -> Path:
    raw = (os.getenv("LOG_DIR") or "").strip()
    d = Path(raw).resolve() if raw else project_root() / "logs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def log_level_name() -> str:
    return (os.getenv("LOG_LEVEL") or "INFO").strip().upper()


def log_max_bytes() -> int:
    try:
        return int(os.getenv("LOG_MAX_BYTES") or "10485760")
    except ValueError:
        return 10_485_760


def log_backup_count() -> int:
    try:
        return int(os.getenv("LOG_BACKUP_COUNT") or "5")
    except ValueError:
        return 5


def return_raw_response() -> bool:
    return (os.getenv("RETURN_RAW_RESPONSE") or "false").lower() == "true"
