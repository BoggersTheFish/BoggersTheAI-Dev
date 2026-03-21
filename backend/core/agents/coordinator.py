from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass
from typing import Any, Optional

logger = logging.getLogger("boggers.agents")

try:
    import redis  # type: ignore
except ImportError:
    redis = None  # type: ignore


@dataclass
class AgentTask:
    id: str
    role: str
    payload: dict[str, Any]
    created_ts: float


class AgentCoordinator:
    """
    Wave 13 multi-agent coordination: enqueue/dequeue tasks with optional Redis
    backing for horizontal scaling; falls back to in-memory asyncio.Queue.
    """

    def __init__(self, redis_url: Optional[str] = None, queue_key: str = "boggers:agent:tasks") -> None:
        self._redis_url = redis_url
        self._queue_key = queue_key
        self._redis = redis.from_url(redis_url, decode_responses=True) if (redis and redis_url) else None
        self._local_queue: asyncio.Queue[AgentTask] = asyncio.Queue()
        self._lock = asyncio.Lock()

    @property
    def backend(self) -> str:
        return "redis" if self._redis else "memory"

    async def submit(self, role: str, payload: dict[str, Any]) -> str:
        tid = str(uuid.uuid4())
        task = AgentTask(id=tid, role=role, payload=payload, created_ts=time.time())
        if self._redis:
            await asyncio.to_thread(
                self._redis.lpush,
                self._queue_key,
                json.dumps(asdict(task)),
            )
        else:
            await self._local_queue.put(task)
        return tid

    async def wait_one(self, timeout: float = 5.0) -> Optional[AgentTask]:
        if self._redis:

            def _brpop() -> Optional[str]:
                out = self._redis.brpop(self._queue_key, timeout=int(timeout))
                if not out:
                    return None
                return out[1]

            raw = await asyncio.to_thread(_brpop)
            if not raw:
                return None
            d = json.loads(raw)
            return AgentTask(**d)
        try:
            return await asyncio.wait_for(self._local_queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    def queue_depth(self) -> int:
        if self._redis:
            return int(self._redis.llen(self._queue_key))
        return self._local_queue.qsize()

    def status(self) -> dict[str, Any]:
        return {"backend": self.backend, "queue_depth": self.queue_depth()}
