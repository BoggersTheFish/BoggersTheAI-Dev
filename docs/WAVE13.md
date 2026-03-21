# Wave 13 — Distributed Graph (implemented in BoggersTheAI-Dev)

Official roadmap ([boggersthefish.com](https://boggersthefish.com)): **Sharding for >10k nodes** and **multi-agent coordination**.

## What was built (full implementation)

### 1. ShardCoordinator — Redis-backed count persistence
- **Code:** [`core/distributed/coordinator.py`](../backend/core/distributed/coordinator.py)
- Consistent hashing: `adler32(node_id) % shard_count` via `ShardRouter`
- Per-shard counts persisted to Redis HASH `boggers:shards:counts` so they survive restarts and are shared across replicas
- Falls back to in-memory dict when Redis is unavailable

### 2. ShardedGraphLayer — multi-shard SQLite + Redis pub/sub
- **Code:** [`core/distributed/sharded_graph.py`](../backend/core/distributed/sharded_graph.py) (**new file**)
- Creates N SQLite shard files: `graph_shard_0.db` … `graph_shard_N-1.db`
- Routes `save_node()` / `save_nodes_batch()` to the correct shard
- `load_all_nodes()` / `load_all_edges()` fan out across all shards and merge (used at startup)
- `broadcast_tension()` publishes cross-shard tension events to Redis pub/sub channel `boggers:tension:broadcast`
- Background subscriber thread logs incoming cross-shard tension spikes

### 3. UniversalLivingGraph — transparent integration
- **Code:** [`core/graph/universal_living_graph.py`](../backend/core/graph/universal_living_graph.py)
- Detects `BOGGERS_DISTRIBUTED_ENABLED=1` at init; builds `ShardedGraphLayer`; falls back gracefully on error
- `save()` / `save_incremental()` route through sharded backend when active
- `load()` calls `_load_from_sharded()` which fans out to all shards
- `run_wave_cycle()` broadcasts tension events after each cycle
- **Wave engine, emergence rules, and stability scoring are completely unchanged** — sharding is invisible above the persistence layer

### 4. REST endpoints
- `GET /distributed/status`  — coordinator health, Redis connectivity, live node count
- `GET /distributed/shards`  — per-shard SQLite node counts (fan-out view)
- `GET /distributed/tension` — live tension snapshot with per-shard node assignments
- `POST /distributed/assign` — dry-run allocation check (does NOT insert)

## Enabling Sharding

In your `.env`:
```
BOGGERS_DISTRIBUTED_ENABLED=1
BOGGERS_SHARD_COUNT=4                # 4 SQLite shard files
BOGGERS_GLOBAL_MAX_NODES=100000
BOGGERS_PER_SHARD_MAX_NODES=25000
REDIS_URL=redis://redis:6379/0
```

Then `docker compose up -d --build`.

## Multi-agent

- **Code:** [`core/agents/coordinator.py`](../backend/core/agents/coordinator.py) — Redis-backed or in-memory asyncio queue
- **API:** `/agents/status`, `/agents/tasks`, `/agents/tasks/wait`
- **Infrastructure:** `redis` service in [`docker-compose.yml`](../docker-compose.yml)

## TS Logic notes

- Sharding affects PERSISTENCE only — the in-memory `UniversalLivingGraph.nodes` dict stays unified
- The wave engine propagates activation across ALL nodes regardless of which shard they persist to
- Tension crossing `tension_threshold` (0.20 default) triggers emergence AND cross-shard broadcast
- Cross-shard tension events are the distributed equivalent of activation propagation

## Rollback

- Set `BOGGERS_DISTRIBUTED_ENABLED=0` — all code paths revert to single SQLite, no data loss
- Existing `graph.db` is unaffected; shard files remain on disk but are ignored
