from __future__ import annotations

import logging
from typing import Any

from backend.app.executors.registry import executor_registry
from backend.app.modules.workflow.schemas import RunNodeRequest, RunNodeResponse

log = logging.getLogger("ai_canvas.workflow")


class WorkflowService:
    def run_node(self, req: RunNodeRequest, request_id: str | None) -> RunNodeResponse:
        log.info(
            "workflow run_node request_id=%s nodeType=%s traceId=%s",
            request_id,
            req.nodeType,
            req.traceId,
        )
        executor = executor_registry.get_for_node_type(req.nodeType)
        outputs = executor.run(
            inputs=req.inputs,
            params=req.params,
            trace_id=req.traceId or "default",
        )
        return RunNodeResponse(outputs=outputs, raw=None)


workflow_service = WorkflowService()
