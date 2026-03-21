from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .shard_router import ShardRouter


@dataclass
class ShardCoordinator:
    """
    Coordinates logical shards for >10k-node workloads: assignment, global caps,
    and per-shard node budgets. Persistence of multiple SQLite files is an operator
    concern; this type is the routing brain used by the API and tests.
    """

    shard_count: int
    global_max_nodes: int
    per_shard_max_nodes: int
    _counts: dict[int, int] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self._router = ShardRouter(self.shard_count)
        if self.per_shard_max_nodes < 1:
            raise ValueError("per_shard_max_nodes must be >= 1")
        if self.global_max_nodes < 1:
            raise ValueError("global_max_nodes must be >= 1")

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
        self._counts[shard] = self._counts.get(shard, 0) + 1
        return shard

    def snapshot(self) -> dict[str, Any]:
        return {
            "shard_count": self.shard_count,
            "global_max_nodes": self.global_max_nodes,
            "per_shard_max_nodes": self.per_shard_max_nodes,
            "per_shard_counts": dict(self._counts),
            "total_nodes": self.total_nodes(),
        }
