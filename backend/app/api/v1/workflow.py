from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from backend.app.schemas.workflow import RunNodeRequest, RunNodeResponse
from backend.app.services.workflow_service import workflow_service

log = logging.getLogger("ai_canvas.api")

router = APIRouter()


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


@router.post("/workflow/run-node", response_model=RunNodeResponse)
def run_workflow_node(req: RunNodeRequest, request: Request) -> RunNodeResponse:
    rid = _request_id(request)
    try:
        return workflow_service.run_node(req, rid)
    except Exception as e:
        log.exception("workflow run_node error request_id=%s", rid)
        raise HTTPException(status_code=500, detail=str(e)) from e
