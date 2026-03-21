# Wave 13 — Distributed graph (prep only)

Official roadmap ([boggersthefish.com](https://boggersthefish.com)): **Wave 13 — Distributed Graph (2026-Q2)** targets sharding for very large graphs and multi-agent coordination.

This repository does **not** implement Wave 13. Use this note to anchor future work:

## Likely touch points in `backend/`

- `core/graph/universal_living_graph.py` — persistence and single-process graph ownership; sharding would split subgraphs across processes or hosts.
- `core/graph/wave_runner.py` — wave cycle assumes one in-memory view; distributed runs need message passing or shared storage semantics.
- `adapters/` + `interface/runtime.py` — multi-agent coordination may mirror adapter boundaries (isolated ingest + merge policies).

## TS-Core reference

The optional clone `reference/TS-Core` documents engine primitives; keep API parity in mind when designing shard boundaries.

## Feature-flag placeholder

When the upstream `config.yaml` schema supports it, add an explicit `future.distributed_graph.enabled: false` (or equivalent) in a dedicated PR; do not add keys that fail `BOGGERS_CONFIG_STRICT=1` in CI until the schema allows them.
