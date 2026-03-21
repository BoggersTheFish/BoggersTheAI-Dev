from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from .shard_router import ShardRouter

logger = logging.getLogger("boggers.distributed.coordinator")

# Wave 13: Redis hash key storing per-shard node counts so they survive restarts
# and are visible to all replicas.  Format: HSET boggers:shards:counts <shard_id> <count>
_REDIS_COUNTS_KEY = "boggers:shards:counts"

try:
    import redis as _redis_lib  # type: ignore
except ImportError:
    _redis_lib = None  # type: ignore


@dataclass
class ShardCoordinator:
    """
    Wave 13 — Distributed Sharding: routing brain for >10k-node workloads.

    Assigns node_ids to shards via consistent hashing (adler32 % shard_count),
    enforces global and per-shard node caps, and optionally persists shard counts
    to Redis so they survive restarts and are shared across replicas.

    TS Logic: This coordinator is a pure allocation oracle — it tells the graph
    layer WHICH shard owns a node, but the graph layer (ShardedGraphLayer) does
    the actual persistence routing.  The wave engine and emergence rules always
    run against the unified in-memory graph; sharding only affects persistence.
    """

    shard_count: int
    global_max_nodes: int
    per_shard_max_nodes: int
    redis_url: Optional[str] = None
    _counts: dict[int, int] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self._router = ShardRouter(self.shard_count)
        self._redis: Any = None
        if self.per_shard_max_nodes < 1:
            raise ValueError("per_shard_max_nodes must be >= 1")
        if self.global_max_nodes < 1:
            raise ValueError("global_max_nodes must be >= 1")
        if self.redis_url and _redis_lib is not None:
            self._connect_redis()

    def _connect_redis(self) -> None:
        """Connect to Redis and load persisted shard counts."""
        try:
            self._redis = _redis_lib.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            self._redis.ping()
            logger.info(
                "ShardCoordinator connected to Redis at %s — counts will persist across restarts",
                self.redis_url,
            )
            self._load_counts_from_redis()
        except Exception as exc:
            logger.warning(
                "ShardCoordinator Redis unavailable (%s) — shard counts are in-memory only",
                exc,
            )
            self._redis = None

    def _load_counts_from_redis(self) -> None:
        """Hydrate in-memory counts from Redis on startup."""
        if self._redis is None:
            return
        try:
            raw = self._redis.hgetall(_REDIS_COUNTS_KEY)
            self._counts = {int(k): int(v) for k, v in raw.items()}
            logger.info("Loaded persisted shard counts from Redis: %s", self._counts)
        except Exception as exc:
            logger.warning("Failed to load shard counts from Redis: %s", exc)

    def _persist_count(self, shard: int, count: int) -> None:
        """Write updated count for a single shard back to Redis."""
        if self._redis is None:
            return
        try:
            self._redis.hset(_REDIS_COUNTS_KEY, str(shard), str(count))
        except Exception as exc:
            logger.debug("Failed to persist shard count to Redis: %s", exc)

    @property
    def router(self) -> ShardRouter:
        return self._router

    def total_nodes(self) -> int:
        return sum(self._counts.values())

    def can_allocate(self, node_id: str) -> tuple[bool, int, str | None]:
        shard = self._router.shard_for_node_id(node_id)
        if self.total_nodes() >= self.global_max_nodes:
            return False, shard, "global_max_nodes"
        cur = self._counts.get(shard, 0)
        if cur >= self.per_shard_max_nodes:
            return False, shard, "per_shard_max_nodes"
        return True, shard, None

    def record_insert(self, node_id: str) -> int:
        ok, shard, reason = self.can_allocate(node_id)
        if not ok:
            raise RuntimeError(f"shard allocation refused: {reason} shard={shard}")
        new_count = self._counts.get(shard, 0) + 1
        self._counts[shard] = new_count
        # Persist to Redis so count survives restarts and is visible to replicas
        self._persist_count(shard, new_count)
        return shard

    def snapshot(self) -> dict[str, Any]:
        return {
            "shard_count": self.shard_count,
            "global_max_nodes": self.global_max_nodes,
            "per_shard_max_nodes": self.per_shard_max_nodes,
            "per_shard_counts": dict(self._counts),
            "total_nodes": self.total_nodes(),
            "redis_connected": self._redis is not None,
        }
