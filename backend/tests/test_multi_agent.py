from __future__ import annotations

import asyncio

from BoggersTheAI.core.agents.coordinator import AgentCoordinator


def test_agent_memory_queue() -> None:
    async def run() -> None:
        c = AgentCoordinator(redis_url=None)
        assert c.backend == "memory"
        tid = await c.submit("ingest", {"x": 1})
        assert len(tid) == 36
        t = await c.wait_one(timeout=2.0)
        assert t is not None
        assert t.role == "ingest"
        assert t.payload["x"] == 1

    asyncio.run(run())
