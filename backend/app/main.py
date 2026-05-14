from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.router import api_router
from backend.app.core.logging import setup_logging
from backend.app.core.settings import settings
from backend.app.middleware.request_logging import RequestLoggingMiddleware

setup_logging()


def create_app() -> FastAPI:
    application = FastAPI(
        title="AI Canvas Python Backend",
        version="1.0.0",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(RequestLoggingMiddleware)

    application.include_router(api_router, prefix="/api")
    return application


app = create_app()
