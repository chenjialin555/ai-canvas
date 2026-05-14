"""
轮转文件日志；控制台仍由 uvicorn 处理。
"""

from __future__ import annotations

import logging
import logging.handlers

from backend.app.core.settings import settings

_initialized = False


def setup_logging() -> None:
    global _initialized
    if _initialized:
        return
    _initialized = True

    level = getattr(logging, settings.log_level_name(), logging.INFO)
    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger()
    root.setLevel(level)

    file_path = settings.resolved_log_dir() / "backend.log"
    fh = logging.handlers.RotatingFileHandler(
        file_path,
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    fh.setLevel(level)
    fh.setFormatter(fmt)
    root.addHandler(fh)

    logging.getLogger(__name__).info(
        "file logging enabled path=%s level=%s max_bytes=%s backups=%s",
        file_path,
        settings.log_level_name(),
        settings.log_max_bytes,
        settings.log_backup_count,
    )
