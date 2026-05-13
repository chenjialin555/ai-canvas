"""
轮转文件日志挂载到 root logger；控制台输出由 uvicorn / 现有 handler 负责。
"""

from __future__ import annotations

import logging
import logging.handlers

from .config import log_backup_count, log_dir, log_level_name, log_max_bytes

_initialized = False


def setup_logging() -> None:
    global _initialized
    if _initialized:
        return
    _initialized = True

    level = getattr(logging, log_level_name(), logging.INFO)
    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger()
    root.setLevel(level)

    file_path = log_dir() / "backend.log"
    fh = logging.handlers.RotatingFileHandler(
        file_path,
        maxBytes=log_max_bytes(),
        backupCount=log_backup_count(),
        encoding="utf-8",
    )
    fh.setLevel(level)
    fh.setFormatter(fmt)
    root.addHandler(fh)

    logging.getLogger(__name__).info(
        "file logging enabled path=%s level=%s max_bytes=%s backups=%s",
        file_path,
        log_level_name(),
        log_max_bytes(),
        log_backup_count(),
    )
