# Wave 13 — Distributed Graph (implemented in BoggersTheAI-Dev)

Official roadmap ([boggersthefish.com](https://boggersthefish.com)): **Sharding for >10k nodes** and **multi-agent coordination**.

## Sharding

- **Code:** [`backend/core/distributed/shard_router.py`](../backend/core/distributed/shard_router.py), [`backend/core/distributed/coordinator.py`](../backend/core/distributed/coordinator.py)
- **Scope:** deterministic **shard assignment** and **capacity accounting** (global + per-shard caps). Physical multi-file SQLite sharding inside `UniversalLivingGraph` can be layered on this router in a follow-up without changing the public `/distributed/*` contract.
- **API:** FastAPI routes under `/distributed/*` (proxied as `/api/boggers/distributed/*` via Next)
- **Enable:** set `BOGGERS_DISTRIBUTED_ENABLED=1` and tune `BOGGERS_SHARD_COUNT`, `BOGGERS_GLOBAL_MAX_NODES`, `BOGGERS_PER_SHARD_MAX_NODES` in `.env` / compose
- **Config:** [`config.docker.yaml`](../config.docker.yaml) keys `distributed_graph.*` (validated when present)

## Multi-agent

- **Code:** [`backend/core/agents/coordinator.py`](../backend/core/agents/coordinator.py) — Redis-backed or in-memory asyncio queue
- **API:** `/agents/status`, `/agents/tasks`, `/agents/tasks/wait`
- **Infrastructure:** `redis` service in [`docker-compose.yml`](../docker-compose.yml); `REDIS_URL=redis://redis:6379/0` by default

## Rollback

- Set `BOGGERS_DISTRIBUTED_ENABLED=0`; remove Redis dependency only if you replace coordinator with memory-only and remove `depends_on` redis (advanced).
