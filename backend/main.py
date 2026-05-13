from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.router import router
from .logging_setup import setup_logging
from .middleware.request_logging import RequestLoggingMiddleware

# 先于 app 装配完成日志（含文件 handler）
setup_logging()


def create_app() -> FastAPI:
    application = FastAPI(
        title="AI Canvas Python Backend",
        version="1.0.0",
    )

    # 后添加的中间件更靠外（先接到请求）；请求日志放在最外层便于统计全程耗时
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(RequestLoggingMiddleware)

    application.include_router(router)
    return application


app = create_app()
