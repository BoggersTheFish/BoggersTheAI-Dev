from __future__ import annotations

import zlib
from dataclasses import dataclass


@dataclass(frozen=True)
class ShardRouter:
    """Deterministic shard assignment for Wave 13 — Distributed Graph."""

    shard_count: int

    def __post_init__(self) -> None:
        if self.shard_count < 1:
            raise ValueError("shard_count must be >= 1")

    def shard_for_node_id(self, node_id: str) -> int:
        h = zlib.adler32(node_id.encode("utf-8")) & 0xFFFFFFFF
        return h % self.shard_count

    def shard_for_topic_key(self, topic: str) -> int:
        return self.shard_for_node_id(topic.strip().lower())
