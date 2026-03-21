from __future__ import annotations

"""
Wave 13 — ShardedGraphLayer

Routes node and edge persistence across N SQLite shard files using the
ShardCoordinator's consistent hash (adler32 % shard_count).  Provides a
drop-in replacement surface for SQLiteGraphBackend as seen by
UniversalLivingGraph, while transparently spreading data across shards.

Redis pub/sub is used for cross-shard tension broadcasting so that tension
detected during a wave cycle can notify other shard partitions (and in a
multi-instance deployment, other backend replicas).

TS Logic integration:
  - Sharding happens at the PERSISTENCE layer only.  The in-memory
    UniversalLivingGraph still holds ALL nodes so wave propagation,
    emergence, and stability scoring work exactly as before.
  - broadcast_tension() publishes a JSON event on boggers:tension:broadcast
    so that any listener (another instance or a monitoring dashboard) can
    react to cross-shard tension spikes.
  - load_all_nodes() / load_all_edges() fan out to every shard and merge —
    used once at startup to hydrate the in-memory graph from persistent
    storage.
"""

import json
import logging
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..graph.sqlite_backend import SQLiteGraphBackend
from ..types import Edge, Node
from .coordinator import ShardCoordinator
from .shard_router import ShardRouter

logger = logging.getLogger("boggers.distributed.sharded_graph")

# Redis pub/sub channel for cross-shard tension events
_TENSION_CHANNEL = "boggers:tension:broadcast"

try:
    import redis as _redis_lib  # type: ignore
except ImportError:
    _redis_lib = None  # type: ignore


class ShardedGraphLayer:
    """
    Wave 13 — sharded persistence layer for the Universal Living Graph.

    Maintains N SQLiteGraphBackend instances (graph_shard_0.db …
    graph_shard_N-1.db) and routes every node write to the shard determined
    by ShardRouter.shard_for_node_id(node_id).  Reads fan out to all shards
    and are merged for startup hydration.

    Redis pub/sub provides lightweight cross-shard tension syncing:
      publish  → broadcast_tension(shard_id, nodes, max_tension)
      subscribe → _TENSION_CHANNEL listener logs events (and can trigger
                  custom callbacks in future multi-instance work).
    """

    def __init__(
        self,
        coordinator: ShardCoordinator,
        base_db_path: str | Path = "/data/graph.db",
        redis_url: Optional[str] = None,
    ) -> None:
        self._coordinator = coordinator
        self._router: ShardRouter = coordinator.router
        self._shard_count: int = coordinator.shard_count
        self._redis_url = redis_url
        self._redis: Any = None
        self._redis_sub_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        # Derive per-shard SQLite paths from the base path.
        # /data/graph.db  →  /data/graph_shard_0.db, /data/graph_shard_1.db …
        base = Path(base_db_path)
        stem = base.stem
        suffix = base.suffix
        parent = base.parent
        self._shards: Dict[int, SQLiteGraphBackend] = {}
        for i in range(self._shard_count):
            shard_path = parent / f"{stem}_shard_{i}{suffix}"
            self._shards[i] = SQLiteGraphBackend(shard_path)
            logger.debug("Wave 13: shard %d initialised at %s", i, shard_path)

        logger.info(
            "Wave 13: ShardedGraphLayer ready — %d shards, base=%s",
            self._shard_count,
            base,
        )

        if redis_url and _redis_lib is not None:
            self._connect_redis(redis_url)

    # ------------------------------------------------------------------
    # Redis pub/sub for cross-shard tension events
    # ------------------------------------------------------------------

    def _connect_redis(self, redis_url: str) -> None:
        try:
            self._redis = _redis_lib.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            self._redis.ping()
            logger.info(
                "Wave 13: ShardedGraphLayer Redis connected — tension pub/sub active"
            )
            self._start_tension_subscriber(redis_url)
        except Exception as exc:
            logger.warning(
                "Wave 13: Redis unavailable for ShardedGraphLayer (%s) — "
                "cross-shard tension sync disabled",
                exc,
            )
            self._redis = None

    def _start_tension_subscriber(self, redis_url: str) -> None:
        """
        Spawn a daemon thread that subscribes to boggers:tension:broadcast and
        logs cross-shard tension events.  In a multi-instance deployment this
        subscriber would also trigger local wave activation boosts.
        """
        stop = self._stop_event

        def _listen() -> None:
            try:
                sub_client = _redis_lib.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2,
                )
                pubsub = sub_client.pubsub()
                pubsub.subscribe(_TENSION_CHANNEL)
                logger.info(
                    "Wave 13: cross-shard tension subscriber active on channel '%s'",
                    _TENSION_CHANNEL,
                )
                for message in pubsub.listen():
                    if stop.is_set():
                        break
                    if message and message.get("type") == "message":
                        try:
                            data = json.loads(message["data"])
                            logger.debug(
                                "Wave 13: cross-shard tension — shard=%s "
                                "max_tension=%.3f nodes=%s",
                                data.get("shard"),
                                data.get("max_tension", 0.0),
                                data.get("high_tension_nodes", []),
                            )
                        except Exception:
                            pass
            except Exception as exc:
                if not stop.is_set():
                    logger.debug("Wave 13: tension subscriber exited: %s", exc)

        self._redis_sub_thread = threading.Thread(
            target=_listen,
            name="TS-OS-TensionSync",
            daemon=True,
        )
        self._redis_sub_thread.start()

    def broadcast_tension(
        self,
        shard_id: int,
        high_tension_nodes: List[str],
        max_tension: float,
    ) -> None:
        """
        Publish a tension event to Redis so other shards/instances can react.
        Called by the wave engine after run_wave_cycle() when tension is high.

        TS Logic: This is the cross-shard activation propagation mechanism —
        a tension spike on one shard may drive wave activity on others.
        """
        if self._redis is None:
            return
        try:
            payload = json.dumps(
                {
                    "shard": shard_id,
                    "high_tension_nodes": high_tension_nodes[:10],
                    "max_tension": round(max_tension, 4),
                }
            )
            self._redis.publish(_TENSION_CHANNEL, payload)
            logger.debug(
                "Wave 13: published tension event shard=%d max_tension=%.3f",
                shard_id,
                max_tension,
            )
        except Exception as exc:
            logger.debug("Wave 13: failed to broadcast tension: %s", exc)

    # ------------------------------------------------------------------
    # Routing helpers
    # ------------------------------------------------------------------

    def shard_for(self, node_id: str) -> int:
        """Return the shard index that owns this node_id (deterministic)."""
        return self._router.shard_for_node_id(node_id)

    # ------------------------------------------------------------------
    # Write interface (mirrors SQLiteGraphBackend)
    # ------------------------------------------------------------------

    def save_node(self, node: Node) -> None:
        shard_id = self.shard_for(node.id)
        self._shards[shard_id].save_node(node)

    def save_nodes_batch(self, nodes: List[Node]) -> None:
        """
        Group nodes by shard and issue one batch write per shard.
        This minimises SQLite transaction overhead when saving many nodes.
        """
        per_shard: Dict[int, List[Node]] = {i: [] for i in range(self._shard_count)}
        for node in nodes:
            per_shard[self.shard_for(node.id)].append(node)
        for shard_id, shard_nodes in per_shard.items():
            if shard_nodes:
                self._shards[shard_id].save_nodes_batch(shard_nodes)

    def save_edges_batch(self, edges: List[Edge]) -> None:
        """
        Route each edge to the shard that owns its source node.
        Cross-shard edges (src shard ≠ dst shard) are stored in the src shard
        so that traversal from a known node never requires a cross-shard lookup.
        """
        per_shard: Dict[int, List[Edge]] = {i: [] for i in range(self._shard_count)}
        for edge in edges:
            per_shard[self.shard_for(edge.src)].append(edge)
        for shard_id, shard_edges in per_shard.items():
            if shard_edges:
                self._shards[shard_id].save_edges_batch(shard_edges)

    # ------------------------------------------------------------------
    # Read interface — fan-out across all shards
    # ------------------------------------------------------------------

    def load_all_nodes(self) -> Dict[str, Node]:
        """
        Fan out to all N shards and merge results.
        Used once at startup to hydrate the in-memory UniversalLivingGraph.
        """
        merged: Dict[str, Node] = {}
        for shard_id, backend in self._shards.items():
            try:
                shard_nodes = backend.load_all_nodes()
                merged.update(shard_nodes)
                logger.debug(
                    "Wave 13: shard %d loaded %d nodes", shard_id, len(shard_nodes)
                )
            except Exception as exc:
                logger.error(
                    "Wave 13: failed to load from shard %d: %s", shard_id, exc
                )
        logger.info(
            "Wave 13: ShardedGraphLayer loaded %d total nodes from %d shards",
            len(merged),
            self._shard_count,
        )
        return merged

    def load_all_edges(self) -> List[Edge]:
        """Fan out to all shards and merge edges."""
        merged: List[Edge] = []
        for shard_id, backend in self._shards.items():
            try:
                merged.extend(backend.load_all_edges())
            except Exception as exc:
                logger.error(
                    "Wave 13: failed to load edges from shard %d: %s", shard_id, exc
                )
        return merged

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    def total_node_count(self) -> int:
        return sum(b.node_count() for b in self._shards.values())

    def shard_stats(self) -> List[Dict[str, Any]]:
        """
        Return per-shard statistics for the GET /distributed/shards endpoint.
        Each dict includes shard_id, db_path, and persisted node_count.
        """
        stats = []
        for shard_id, backend in self._shards.items():
            try:
                count = backend.node_count()
            except Exception:
                count = -1
            stats.append(
                {
                    "shard_id": shard_id,
                    "db_path": str(backend.db_path),
                    "node_count": count,
                }
            )
        return stats

    def stop(self) -> None:
        """Signal the tension subscriber thread to stop."""
        self._stop_event.set()
