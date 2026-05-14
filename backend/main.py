"""向后兼容：历史入口 `backend.main:app`。"""

from backend.app.main import app, create_app

__all__ = ["app", "create_app"]
