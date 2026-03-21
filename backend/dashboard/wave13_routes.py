from __future__ import annotations

import logging
import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from BoggersTheAI.core.agents.coordinator import AgentCoordinator
from BoggersTheAI.core.distributed.coordinator import ShardCoordinator

logger = logging.getLogger("boggers.dashboard.wave13")

_shard: Optional[ShardCoordinator] = None
_agents: Optional[AgentCoordinator] = None


def _load_shard() -> Optional[ShardCoordinator]:
    global _shard
    if _shard is not None:
        return _shard
    enabled = os.environ.get("BOGGERS_DISTRIBUTED_ENABLED", "").strip().lower() in ("1", "true", "yes")
    if not enabled:
        return None
    count = int(os.environ.get("BOGGERS_SHARD_COUNT", "4"))
    global_max = int(os.environ.get("BOGGERS_GLOBAL_MAX_NODES", "100000"))
    per_shard = int(os.environ.get("BOGGERS_PER_SHARD_MAX_NODES", "25000"))
    _shard = ShardCoordinator(
        shard_count=max(1, count),
        global_max_nodes=global_max,
        per_shard_max_nodes=per_shard,
    )
    return _shard


def _load_agents() -> AgentCoordinator:
    global _agents
    if _agents is not None:
        return _agents
    url = os.environ.get("REDIS_URL", "").strip() or None
    _agents = AgentCoordinator(redis_url=url)
    return _agents


def register_wave13_routes(
    app: Any,
    check_auth: Any,
) -> None:
    router = APIRouter(prefix="/distributed", tags=["distributed"])

    @router.get("/status")
    def dist_status(_: None = Depends(check_auth)) -> dict[str, Any]:
        c = _load_shard()
        if not c:
            return {"enabled": False}
        return {"enabled": True, **c.snapshot()}

    @router.post("/assign")
    def dist_assign(
        body: dict[str, Any],
        _: None = Depends(check_auth),
    ) -> dict[str, Any]:
        c = _load_shard()
        if not c:
            raise HTTPException(status_code=400, detail="distributed graph disabled")
        node_id = str(body.get("node_id", "")).strip()
        if not node_id:
            raise HTTPException(status_code=400, detail="node_id required")
        ok, shard, reason = c.can_allocate(node_id)
        return {"ok": ok, "shard": shard, "reason": reason}

    app.include_router(router)

    ar = APIRouter(prefix="/agents", tags=["agents"])

    class TaskIn(BaseModel):
        role: str = Field(min_length=1, max_length=64)
        payload: dict[str, Any] = Field(default_factory=dict)

    @ar.get("/status")
    async def agent_status(_: None = Depends(check_auth)) -> dict[str, Any]:
        coord = _load_agents()
        return coord.status()

    @ar.post("/tasks")
    async def agent_submit(
        body: TaskIn,
        _: None = Depends(check_auth),
    ) -> dict[str, str]:
        coord = _load_agents()
        tid = await coord.submit(body.role, body.payload)
        return {"task_id": tid}

    @ar.post("/tasks/wait")
    async def agent_wait(
        request: Request,
        _: None = Depends(check_auth),
    ) -> dict[str, Any]:
        coord = _load_agents()
        timeout = float(request.query_params.get("timeout", "2"))
        task = await coord.wait_one(timeout=timeout)
        if not task:
            return {"ok": False, "task": None}
        return {"ok": True, "task": task.__dict__}

    app.include_router(ar)
