from __future__ import annotations

from BoggersTheAI.core.distributed import ShardCoordinator, ShardRouter


def test_shard_router_deterministic() -> None:
    r = ShardRouter(8)
    assert r.shard_for_node_id("abc") == r.shard_for_node_id("abc")
    assert 0 <= r.shard_for_node_id("x") < 8


def test_coordinator_caps() -> None:
    c = ShardCoordinator(shard_count=4, global_max_nodes=5, per_shard_max_nodes=2)
    for i in range(5):
        c.record_insert(f"n{i}")
    assert c.total_nodes() == 5
    ok, _, reason = c.can_allocate("overflow")
    assert ok is False
    assert reason == "global_max_nodes"


def test_per_shard_cap() -> None:
    c = ShardCoordinator(shard_count=1, global_max_nodes=100, per_shard_max_nodes=2)
    c.record_insert("a")
    c.record_insert("b")
    ok, _, reason = c.can_allocate("c")
    assert ok is False
    assert reason == "per_shard_max_nodes"
