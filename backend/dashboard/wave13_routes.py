from __future__ import annotations

"""
Wave 13 + Wave 16 — Distributed Sharding & Multi-Agent Coordination Routes

REST surface for the distributed graph layer, the agent task queue, and the
Wave 16 multi-agent negotiation system.

TS Logic:
  Wave 13:
    /distributed/status  — shard coordinator health + Redis connectivity
    /distributed/shards  — per-shard SQLite node counts
    /distributed/tension — live cross-shard tension snapshot
    /distributed/assign  — dry-run allocation check

  Wave 16 (new):
    /agents/list         — all active agents with negotiation weights
    /agents/register     — register a new agent perspective
    /agents/negotiate    — run one negotiation round (tension → bids → winner)
    /agents/dashboard    — HTML multi-agent dashboard view
    /agents/status       — queue depth (existing)
    /agents/tasks        — enqueue task (existing)
    /agents/tasks/wait   — dequeue task (existing)
"""

import logging
import os
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from BoggersTheAI.core.agents.coordinator import AgentCoordinator
from BoggersTheAI.core.agents.negotiation import AgentNegotiator
from BoggersTheAI.core.agents.registry import AgentRegistry
from BoggersTheAI.core.distributed.coordinator import ShardCoordinator

logger = logging.getLogger("boggers.dashboard.wave13")

_shard: Optional[ShardCoordinator] = None
_agents: Optional[AgentCoordinator] = None

# Wave 16: registry and negotiator singletons
_registry: Optional[AgentRegistry] = None
_negotiator: Optional[AgentNegotiator] = None

# Built-in agent roles seeded on first request to /agents/list or /agents/register
_BUILTIN_AGENTS = [
    ("explorer",     "exploration",   0.6),
    ("consolidator", "consolidation", 0.5),
    ("synthesizer",  "synthesis",     0.55),
]


def _load_shard() -> Optional[ShardCoordinator]:
    global _shard
    if _shard is not None:
        return _shard
    enabled = (
        os.environ.get("BOGGERS_DISTRIBUTED_ENABLED", "").strip().lower()
        in ("1", "true", "yes")
    )
    if not enabled:
        return None
    count = int(os.environ.get("BOGGERS_SHARD_COUNT", "4"))
    global_max = int(os.environ.get("BOGGERS_GLOBAL_MAX_NODES", "100000"))
    per_shard = int(os.environ.get("BOGGERS_PER_SHARD_MAX_NODES", "25000"))
    # Wave 13: pass redis_url so counts persist across restarts
    redis_url = os.environ.get("REDIS_URL", "").strip() or None
    _shard = ShardCoordinator(
        shard_count=max(1, count),
        global_max_nodes=global_max,
        per_shard_max_nodes=per_shard,
        redis_url=redis_url,
    )
    return _shard


def _load_agents() -> AgentCoordinator:
    global _agents
    if _agents is not None:
        return _agents
    url = os.environ.get("REDIS_URL", "").strip() or None
    _agents = AgentCoordinator(redis_url=url)
    return _agents


def _load_registry() -> AgentRegistry:
    """Wave 16: return the shared AgentRegistry, creating it on first call."""
    global _registry
    if _registry is not None:
        return _registry
    redis_client = None
    url = os.environ.get("REDIS_URL", "").strip() or None
    if url:
        try:
            import redis as _rl  # type: ignore
            redis_client = _rl.from_url(url, decode_responses=True,
                                         socket_connect_timeout=2, socket_timeout=2)
            redis_client.ping()
        except Exception:
            redis_client = None
    _registry = AgentRegistry(redis_client=redis_client)
    # Seed built-in agent perspectives
    for agent_id, role, budget in _BUILTIN_AGENTS:
        _registry.register(agent_id, role, budget)
    return _registry


def _load_negotiator() -> AgentNegotiator:
    """Wave 16: return the shared AgentNegotiator."""
    global _negotiator
    if _negotiator is not None:
        return _negotiator
    _negotiator = AgentNegotiator(_load_registry())
    return _negotiator


def register_wave13_routes(
    app: Any,
    check_auth: Any,
    get_runtime_fn: Optional[Callable[[], Any]] = None,
) -> None:
    """
    Register Wave 13 routes onto the FastAPI app.

    get_runtime_fn: optional callable that returns the live BoggersRuntime.
    When provided, /distributed/shards and /distributed/tension can read live
    shard stats directly from the graph's ShardedGraphLayer.
    """
    router = APIRouter(prefix="/distributed", tags=["distributed"])

    @router.get("/status")
    def dist_status(_: None = Depends(check_auth)) -> dict[str, Any]:
        """
        Overall distributed coordinator status.
        Returns enabled=False when BOGGERS_DISTRIBUTED_ENABLED is off.
        When enabled, includes per-shard counts and Redis connectivity.
        """
        c = _load_shard()
        if not c:
            return {"enabled": False}
        snap = c.snapshot()
        # Enrich with live graph shard info if runtime is available
        if get_runtime_fn is not None:
            try:
                rt = get_runtime_fn()
                sharded = getattr(rt.graph, "_sharded_backend", None)
                if sharded is not None:
                    snap["live_node_count"] = sharded.total_node_count()
            except Exception:
                pass
        return {"enabled": True, **snap}

    @router.get("/shards")
    def dist_shards(_: None = Depends(check_auth)) -> dict[str, Any]:
        """
        Per-shard SQLite node counts — the "fan-out view" of the sharded graph.

        TS Logic: Each shard is a separate SQLite file named graph_shard_N.db.
        The ShardRouter uses adler32(node_id) % shard_count to assign nodes
        deterministically, so the distribution should be roughly uniform.
        """
        if get_runtime_fn is None:
            return {"enabled": False, "shards": [], "note": "runtime not wired"}
        try:
            rt = get_runtime_fn()
            sharded = getattr(rt.graph, "_sharded_backend", None)
            if sharded is None:
                return {
                    "enabled": False,
                    "shards": [],
                    "note": "distributed sharding is disabled",
                }
            stats = sharded.shard_stats()
            total = sum(s["node_count"] for s in stats if s["node_count"] >= 0)
            return {
                "enabled": True,
                "shard_count": sharded._shard_count,
                "total_persisted_nodes": total,
                "shards": stats,
            }
        except Exception as exc:
            logger.exception("dist_shards error")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @router.get("/tension")
    def dist_tension(_: None = Depends(check_auth)) -> dict[str, Any]:
        """
        Live cross-shard tension snapshot from the wave engine.

        Returns the current tension level and the top high-tension nodes.
        TS Logic: Tension = |activation - base_strength|.  Nodes above
        tension_threshold are candidates for emergence (new nodes / edges spawn).
        In distributed mode this endpoint also shows which shard each high-tension
        node belongs to so operators can identify hot shards.
        """
        if get_runtime_fn is None:
            return {"tension": 0.0, "high_tension_nodes": [], "note": "runtime not wired"}
        try:
            rt = get_runtime_fn()
            graph = rt.graph
            tensions = graph.detect_tensions()
            sorted_nodes = sorted(tensions.items(), key=lambda kv: -kv[1])[:10]
            high_tension = []
            sharded = getattr(graph, "_sharded_backend", None)
            for node_id, score in sorted_nodes:
                entry: dict[str, Any] = {
                    "node_id": node_id,
                    "tension": round(score, 4),
                }
                if sharded is not None:
                    entry["shard"] = sharded.shard_for(node_id)
                high_tension.append(entry)
            return {
                "max_tension": round(max(tensions.values(), default=0.0), 4),
                "tense_node_count": len(tensions),
                "high_tension_nodes": high_tension,
                "distributed": sharded is not None,
            }
        except Exception as exc:
            logger.exception("dist_tension error")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @router.post("/assign")
    def dist_assign(
        body: dict[str, Any],
        _: None = Depends(check_auth),
    ) -> dict[str, Any]:
        """
        Dry-run allocation check: returns which shard would own a node_id
        and whether the global / per-shard caps allow insertion.
        Does NOT actually insert the node.
        """
        c = _load_shard()
        if not c:
            raise HTTPException(status_code=400, detail="distributed graph disabled")
        node_id = str(body.get("node_id", "")).strip()
        if not node_id:
            raise HTTPException(status_code=400, detail="node_id required")
        ok, shard, reason = c.can_allocate(node_id)
        return {"ok": ok, "shard": shard, "reason": reason}

    app.include_router(router)

    # ------------------------------------------------------------------
    # Multi-agent task queue routes
    # ------------------------------------------------------------------
    ar = APIRouter(prefix="/agents", tags=["agents"])

    class TaskIn(BaseModel):
        role: str = Field(min_length=1, max_length=64)
        payload: dict[str, Any] = Field(default_factory=dict)

    @ar.get("/status")
    async def agent_status(_: None = Depends(check_auth)) -> dict[str, Any]:
        coord = _load_agents()
        return coord.status()

    @ar.post("/tasks")
    async def agent_submit(
        body: TaskIn,
        _: None = Depends(check_auth),
    ) -> dict[str, str]:
        coord = _load_agents()
        tid = await coord.submit(body.role, body.payload)
        return {"task_id": tid}

    @ar.post("/tasks/wait")
    async def agent_wait(
        request: Request,
        _: None = Depends(check_auth),
    ) -> dict[str, Any]:
        coord = _load_agents()
        timeout = float(request.query_params.get("timeout", "2"))
        task = await coord.wait_one(timeout=timeout)
        if not task:
            return {"ok": False, "task": None}
        return {"ok": True, "task": task.__dict__}

    app.include_router(ar)

    # ------------------------------------------------------------------
    # Wave 16 — Multi-Agent Coordination routes
    # ------------------------------------------------------------------
    w16 = APIRouter(tags=["multi-agent"])

    class RegisterIn(BaseModel):
        agent_id: str = Field(min_length=1, max_length=64)
        role: str = Field(min_length=1, max_length=64)
        activation_budget: float = Field(default=0.5, ge=0.0, le=1.0)

    @w16.get("/agents/list")
    def agents_list(_: None = Depends(check_auth)) -> dict[str, Any]:
        """
        Wave 16: list all active agents with their negotiation weights.

        TS Logic: The registry exposes the current competitive landscape —
        which agent perspectives are live, their win rates, and their current
        negotiation weights. High-weight agents have stronger graph influence.
        """
        reg = _load_registry()
        return {
            "agents": reg.snapshot(),
            "agent_count": reg.agent_count(),
            "negotiation_rounds": _load_negotiator().round_count,
        }

    @w16.post("/agents/register")
    def agents_register(
        body: RegisterIn,
        _: None = Depends(check_auth),
    ) -> dict[str, Any]:
        """
        Wave 16: register a new agent perspective.

        TS Logic: Each registered agent represents a distinct reasoning mode
        (exploration, consolidation, synthesis, …).  Multiple agents competing
        over the same tense nodes creates diverse activation patterns and prevents
        any single perspective from monopolising the graph.
        """
        reg = _load_registry()
        state = reg.register(
            agent_id=body.agent_id,
            role=body.role,
            activation_budget=body.activation_budget,
        )
        return {"ok": True, "agent": state.to_dict()}

    @w16.post("/agents/negotiate")
    def agents_negotiate(
        _: None = Depends(check_auth),
        top_k: int = 3,
    ) -> dict[str, Any]:
        """
        Wave 16: run one negotiation round.

        Steps:
          1. Detect top-k tense nodes in the live graph
          2. Each active agent submits a bid
          3. Winner pushes activation; edge weights updated
          4. Registry win/loss records updated

        TS Logic: Tension = |activation − base_strength| is the currency.
        Agents compete to activate the most unstable nodes, which drives
        emergence and keeps the graph alive under multi-agent load.
        """
        if get_runtime_fn is None:
            raise HTTPException(status_code=400, detail="runtime not available")
        try:
            rt = get_runtime_fn()
            neg = _load_negotiator()
            results = neg.run_round(rt.graph, top_k=max(1, min(top_k, 10)))
            return {
                "ok": True,
                "round": neg.round_count,
                "contested_nodes": len(results),
                "results": [r.to_dict() for r in results],
            }
        except Exception as exc:
            logger.exception("agents_negotiate error")
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @w16.get("/agents/dashboard", response_class=HTMLResponse)
    def agents_dashboard(_: None = Depends(check_auth)) -> str:
        """
        Wave 16: HTML multi-agent dashboard.
        Shows active agents, negotiation round count, and recent outcomes.
        """
        reg = _load_registry()
        neg = _load_negotiator()
        agents = reg.snapshot()
        recent = neg.recent_results(10)

        rows = ""
        for a in agents:
            age = a.get("age_seconds", 0)
            status = "🟢" if age < 30 else ("🟡" if age < 90 else "🔴")
            rows += (
                f"<tr>"
                f"<td>{status} {a['agent_id']}</td>"
                f"<td>{a['role']}</td>"
                f"<td>{a['activation_budget']:.2f}</td>"
                f"<td>{a['negotiation_weight']:.3f}</td>"
                f"<td>{a['wins']}/{a['total_bids']}</td>"
                f"<td>{a['win_rate']:.0%}</td>"
                f"<td>{age:.0f}s</td>"
                f"</tr>"
            )

        result_rows = ""
        for r in recent:
            result_rows += (
                f"<tr>"
                f"<td>{r['node_id']}</td>"
                f"<td><b>{r['winner']}</b></td>"
                f"<td>{r['winning_amount']:.3f}</td>"
                f"<td>{r['tension_score']:.3f}</td>"
                f"<td>{r['competing_agents']}</td>"
                f"<td>{r['activation_before']:.3f} → {r['activation_after']:.3f}</td>"
                f"</tr>"
            )

        return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Wave 16 — Multi-Agent Dashboard</title>
  <meta http-equiv="refresh" content="5">
  <style>
    body {{background:#0a0a0f;color:#ddd;font-family:monospace;padding:20px}}
    h1 {{color:#a78bfa;margin-bottom:4px}}
    .sub {{color:#666;font-size:12px;margin-bottom:24px}}
    table {{border-collapse:collapse;width:100%;margin-bottom:32px}}
    th {{color:#a78bfa;text-align:left;padding:6px 12px;border-bottom:1px solid #333;font-size:12px}}
    td {{padding:5px 12px;font-size:12px;border-bottom:1px solid #1a1a2e}}
    tr:hover td {{background:#111120}}
    .stat {{display:inline-block;background:#111120;border:1px solid #333;
            border-radius:8px;padding:10px 20px;margin-right:12px;margin-bottom:12px}}
    .stat-val {{font-size:24px;font-weight:bold;color:#a78bfa}}
    .stat-lbl {{font-size:11px;color:#666}}
    .refresh {{color:#666;font-size:11px;float:right}}
  </style>
</head>
<body>
  <h1>⚡ Wave 16 — Multi-Agent Coordination</h1>
  <div class="sub">TS-OS multi-agent negotiation dashboard · auto-refresh 5s</div>
  <div>
    <div class="stat"><div class="stat-val">{reg.agent_count()}</div><div class="stat-lbl">Active Agents</div></div>
    <div class="stat"><div class="stat-val">{neg.round_count}</div><div class="stat-lbl">Negotiation Rounds</div></div>
    <div class="stat"><div class="stat-val">{len(recent)}</div><div class="stat-lbl">Recent Outcomes</div></div>
  </div>
  <h2 style="color:#ccc;font-size:14px;margin-top:24px">Active Agents</h2>
  <table>
    <thead><tr>
      <th>Agent</th><th>Role</th><th>Budget</th><th>Weight</th>
      <th>Wins/Bids</th><th>Win Rate</th><th>Last Seen</th>
    </tr></thead>
    <tbody>{rows if rows else '<tr><td colspan="7" style="color:#555">No agents registered — POST /agents/register</td></tr>'}</tbody>
  </table>
  <h2 style="color:#ccc;font-size:14px">Recent Negotiation Outcomes</h2>
  <table>
    <thead><tr>
      <th>Node</th><th>Winner</th><th>Bid</th><th>Tension</th>
      <th>Competing</th><th>Activation Δ</th>
    </tr></thead>
    <tbody>{result_rows if result_rows else '<tr><td colspan="6" style="color:#555">No rounds run — POST /agents/negotiate</td></tr>'}</tbody>
  </table>
  <div style="color:#444;font-size:11px">
    Trigger: POST /agents/negotiate · Register: POST /agents/register ·
    List: GET /agents/list · <span class="refresh">TS Logic: tension drives negotiation</span>
  </div>
</body>
</html>"""

    app.include_router(w16)


# === WAVE 13 COMPLETE ===
# Distributed Sharding (>10k nodes) implementation summary:
#
# 1. ShardCoordinator (core/distributed/coordinator.py)
#    - Consistent hashing: adler32(node_id) % shard_count
#    - Per-shard counts now persisted to Redis HASH (boggers:shards:counts)
#      so they survive restarts and are shared across replicas
#    - Falls back to in-memory if Redis is unavailable
#
# 2. ShardedGraphLayer (core/distributed/sharded_graph.py) — NEW
#    - Creates N SQLiteGraphBackend instances: graph_shard_0.db … graph_shard_N-1.db
#    - Routes save_node() / save_nodes_batch() to the correct shard
#    - load_all_nodes() / load_all_edges() fan out to all shards and merge
#    - Cross-shard tension events published to Redis pub/sub (boggers:tension:broadcast)
#    - Background subscriber thread logs cross-shard tension spikes
#
# 3. UniversalLivingGraph (core/graph/universal_living_graph.py)
#    - Detects BOGGERS_DISTRIBUTED_ENABLED=1 at init
#    - Builds ShardedGraphLayer when enabled; falls back gracefully if it fails
#    - save() / save_incremental() route through sharded backend when active
#    - load() fan-outs via _load_from_sharded() on startup
#    - run_wave_cycle() publishes cross-shard tension after each cycle
#    - Wave engine + emergence rules are UNCHANGED — sharding is invisible above
#      the persistence layer
#
# 4. wave13_routes.py (this file)
#    - GET /distributed/status  — coordinator health + Redis connectivity
#    - GET /distributed/shards  — per-shard SQLite node counts (live)
#    - GET /distributed/tension — live tension snapshot with shard assignments
#    - POST /distributed/assign — dry-run allocation check
#
# Test:
#   docker compose up -d --build
#   # With sharding DISABLED (default):
#   curl http://localhost:8000/distributed/status
#   # → {"enabled": false}
#   #
#   # To enable sharding (edit .env):
#   # BOGGERS_DISTRIBUTED_ENABLED=1
#   # docker compose up -d --build
#   # curl http://localhost:8000/distributed/status
#   # → {"enabled":true,"shard_count":4,...,"redis_connected":true}
#   # curl http://localhost:8000/distributed/shards
#   # → {"enabled":true,"shard_count":4,"shards":[{"shard_id":0,...},...]
#   # curl http://localhost:8000/distributed/tension
#   # → {"max_tension":0.0,"tense_node_count":0,"high_tension_nodes":[],"distributed":true}

# === WAVE 16 COMPLETE ===
# Multi-Agent Coordination implementation summary:
#
# 1. AgentRegistry (core/agents/registry.py) — NEW
#    - Redis-backed TTL heartbeats (120s): dead agents auto-evicted
#    - negotiation_weight: starts 0.5, climbs on wins (+0.05), decays on losses (-0.02)
#    - Falls back to in-memory dict when Redis is unavailable
#    - Built-in agents seeded on startup: explorer, consolidator, synthesizer
#
# 2. AgentNegotiator (core/agents/negotiation.py) — NEW
#    - Negotiation protocol: tension → bids → winner → activation push + edge update
#    - bid = activation_budget × negotiation_weight × tension_score + jitter
#    - Winner: +0.08 edge weight to contested node, losers: -0.04
#    - Synthetic agent nodes (agent:<id>) created in the live graph
#    - round_count and recent_results() for dashboard
#
# 3. wave13_routes.py (this file) — Wave 16 additions
#    - GET  /agents/list       — active agents + negotiation stats
#    - POST /agents/register   — register a new agent perspective
#    - POST /agents/negotiate  — run one round (uses live graph tension)
#    - GET  /agents/dashboard  — HTML dashboard (auto-refresh 5s)
#
# 4. Frontend (MultiAgentPanel.tsx + waves page)
#    - Live agent table with negotiation weight bars
#    - "Negotiate" button triggers one round and shows outcome log
#    - Polls /agents/list every 4s; graceful offline banner
#    - Wired into /waves page alongside roadmap nodes
#
# Test:
#   docker compose up -d --build
#   # Visit http://localhost:3000/waves → see Multi-Agent section
#   # Or directly:
#   curl http://localhost:8000/agents/list
#   # → {"agents":[{"agent_id":"explorer","role":"exploration",...}],...}
#   curl -X POST http://localhost:8000/agents/negotiate
#   # → {"ok":true,"round":1,"contested_nodes":2,"results":[...]}
#   curl http://localhost:8000/agents/list  # → negotiation_weight changed
#   # HTML dashboard: http://localhost:8000/agents/dashboard
