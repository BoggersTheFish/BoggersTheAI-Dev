from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from BoggersTheAI.core.metrics import metrics as metrics_collector
from BoggersTheAI.interface.api import _sanitize_tenant_id, get_runtime


def _tenant_from_request(request: Request) -> str | None:
    """Header (fetch) or query param (EventSource cannot set custom headers)."""
    q = request.query_params.get("tenant_id") or request.query_params.get("tenant")
    if q and str(q).strip():
        return _sanitize_tenant_id(str(q).strip())
    h = request.headers.get("x-boggers-tenant-id") or request.headers.get("x-tenant-id")
    return _sanitize_tenant_id(h)


def _session_or_ip_key(request: Request) -> str:
    sid = request.headers.get("x-boggers-session-id")
    if sid:
        return f"session:{sid[:128]}"
    return get_remote_address(request)


limiter = Limiter(key_func=get_remote_address)


def _cors_origins() -> list[str]:
    raw = os.environ.get("BOGGERS_CORS_ORIGINS", "").strip()
    if raw:
        return [x.strip() for x in raw.split(",") if x.strip()]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


class SessionLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        sid = request.headers.get("x-boggers-session-id")
        if sid:
            _logger.debug("x-boggers-session-id present (len=%d)", len(sid))
        return await call_next(request)


app = FastAPI(title="BoggersTheAI Dashboard", version="0.5.0")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SessionLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_tension_history: list[dict[str, Any]] = []
_history_lock = threading.Lock()

_AUTH_TOKEN = os.environ.get("BOGGERS_DASHBOARD_TOKEN", "")
_logger = logging.getLogger("boggers.dashboard")


def _check_auth(authorization: str = Header(default="")) -> None:
    if _AUTH_TOKEN and authorization != f"Bearer {_AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def _collect_status() -> dict[str, Any]:
    status = get_runtime().get_status()
    with _history_lock:
        _tension_history.append(
            {
                "cycle": int(status.get("cycle_count", 0)),
                "tension": float(status.get("tension", 0.0)),
            }
        )
        if len(_tension_history) > 300:
            del _tension_history[:-300]
    return status


@app.get("/health/live")
def health_live() -> dict[str, str]:
    return {"status": "alive"}


@app.get("/health/ready")
def health_ready(
    _: None = Depends(_check_auth),
) -> dict[str, Any]:
    checks = get_runtime().run_health_checks()
    return {"status": "ready", "checks": checks}


@app.get("/status")
def status(
    _: None = Depends(_check_auth),
) -> dict[str, Any]:
    return {
        "status": _collect_status(),
        "graph": {
            "nodes": len(get_runtime().graph.nodes),
            "edges": len(get_runtime().graph.edges),
            "path": str(get_runtime().graph.graph_path),
        },
    }


@app.get("/wave", response_class=HTMLResponse)
def wave() -> str:
    _collect_status()
    return r"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>BoggersTheAI Wave Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <h2>BoggersTheAI Wave Tension</h2>
    <canvas id="waveChart" width="900" height="360"></canvas>
    <script>
      const ctx = document.getElementById("waveChart").getContext("2d");
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [{
            label: "Tension",
            data: [],
            borderWidth: 2,
            fill: false,
          }],
        },
        options: {
          responsive: true,
          animation: false,
          scales: {
            y: { beginAtZero: true, max: 1.5 },
          },
        },
      });

      const _token = document.cookie.replace(
        /(?:(?:^|.*;\s*)boggers_token\s*=\s*([^;]*).*$)|^.*$/,
        "$1",
      );
      const _hdrs = _token ? { "Authorization": "Bearer " + _token } : {};
      async function tick() {
        const response = await fetch("/status", { headers: _hdrs });
        const payload = await response.json();
        const s = payload.status || {};
        chart.data.labels.push(s.cycle_count ?? 0);
        chart.data.datasets[0].data.push(s.tension ?? 0);
        if (chart.data.labels.length > 120) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
        }
        chart.update();
      }

      tick();
      setInterval(tick, 2000);
    </script>
  </body>
</html>
"""


def _graph_node_kind(node_id: str) -> str:
    if node_id.startswith("user_probe:"):
        return "probe"
    if node_id.startswith("conversation:"):
        return "conversation"
    if node_id.startswith("query:"):
        return "query"
    if node_id.startswith("session:"):
        return "session"
    if node_id.startswith("runtime:"):
        return "runtime"
    if node_id.startswith("image_caption:"):
        return "multimodal"
    return "concept"


def _node_matches_session(n: Any, sid: str) -> bool:
    if n.id.startswith(f"conversation:{sid}:"):
        return True
    if n.id == f"session:{sid}":
        return True
    attrs = getattr(n, "attributes", None) or {}
    if str(attrs.get("session_id", "")) == sid:
        return True
    return False


def _expand_session_neighbors(
    g: Any,
    seeds: list[Any],
    hops: int,
) -> list[Any]:
    """Include adjacent nodes (wave substrate connectivity) up to `hops` steps."""
    if hops <= 0 or not seeds:
        return seeds
    seen = {n.id for n in seeds}
    out: list[Any] = list(seeds)
    frontier: list[Any] = list(seeds)
    for _ in range(hops):
        nxt: list[Any] = []
        for n in frontier:
            gn = getattr(g, "get_neighbors", None)
            if not callable(gn):
                continue
            neighbors = gn(n.id)
            if not isinstance(neighbors, dict):
                continue
            for nb_id in neighbors.keys():
                if nb_id in seen:
                    continue
                node = g.get_node(nb_id)
                if node and not node.collapsed:
                    seen.add(nb_id)
                    nxt.append(node)
        if not nxt:
            break
        out.extend(nxt)
        frontier = nxt
    return out


def _build_graph_payload(
    rt: Any,
    *,
    max_nodes: Optional[int],
    content_preview: int,
    session_id: Optional[str],
    highlight: bool,
    session_expand: int = 0,
    session_strict: bool = False,
) -> dict[str, Any]:
    """Shared snapshot for GET /graph and SSE /graph/stream."""
    g = rt.graph
    sid = (session_id or "").strip()[:128] or None
    candidates = [n for n in g.nodes.values() if not n.collapsed]
    session_matched = True
    if sid:
        filtered = [n for n in candidates if _node_matches_session(n, sid)]
        if filtered:
            seeds = _expand_session_neighbors(g, filtered, session_expand)
            candidates = seeds
        else:
            session_matched = False
            if session_strict:
                metrics_collector.increment("graph_session_filter_empty_strict")
                wave = rt.get_status()
                return {
                    "nodes": [],
                    "edges": [],
                    "meta": {
                        "total_nodes": len(g.nodes),
                        "total_edges": len(g.edges),
                        "shown_nodes": 0,
                        "shown_edges": 0,
                        "cycle_count": int(wave.get("cycle_count", 0)),
                        "tension": float(wave.get("tension", 0.0)),
                        "thread_alive": bool(wave.get("thread_alive", False)),
                        "session_filter": True,
                        "session_matched": False,
                        "session_strict": True,
                        "session_expand": int(session_expand),
                        "highlight_nodes": 0,
                    },
                }
            metrics_collector.increment("graph_session_filter_empty_fallback")
            candidates = [n for n in g.nodes.values() if not n.collapsed]
    candidates.sort(
        key=lambda n: n.activation * getattr(n, "base_strength", 0.5), reverse=True
    )
    if max_nodes is not None:
        top = candidates[:max_nodes]
    else:
        top = candidates
    id_set = {n.id for n in top}

    highlight_ids: set[str] = set()
    if highlight and sid:
        highlight_ids = set(rt.get_last_query_highlight(sid))

    preview_len = content_preview
    if preview_len > 0 and len(top) > 600:
        preview_len = 0

    nodes: list[dict[str, Any]] = []
    for n in top:
        act = float(n.activation)
        stab = float(n.stability)
        ts_heat = max(0.0, min(1.0, act * (1.0 - stab)))
        row: dict[str, Any] = {
            "id": n.id,
            "topics": n.topics,
            "activation": act,
            "stability": stab,
            "base_strength": float(getattr(n, "base_strength", 0.5)),
            "collapsed": n.collapsed,
            "kind": _graph_node_kind(n.id),
            "highlight": n.id in highlight_ids,
            "ts_heat": ts_heat,
        }
        if preview_len > 0:
            raw = (n.content or "").strip().replace("\n", " ")
            row["content_preview"] = raw[:preview_len]
        nodes.append(row)

    edges = [
        {
            "src": e.src,
            "dst": e.dst,
            "weight": e.weight,
            "relation": getattr(e, "relation", "relates"),
        }
        for e in g.edges
        if e.src in id_set and e.dst in id_set
    ]

    wave = rt.get_status()
    shown_highlight = sum(1 for n in nodes if n.get("highlight"))
    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "total_nodes": len(g.nodes),
            "total_edges": len(g.edges),
            "shown_nodes": len(nodes),
            "shown_edges": len(edges),
            "cycle_count": int(wave.get("cycle_count", 0)),
            "tension": float(wave.get("tension", 0.0)),
            "thread_alive": bool(wave.get("thread_alive", False)),
            "session_filter": bool(sid),
            "session_matched": session_matched,
            "session_strict": bool(session_strict and sid),
            "session_expand": int(session_expand) if sid else 0,
            "highlight_nodes": shown_highlight,
        },
    }


@limiter.limit("300/minute", key_func=_session_or_ip_key)
@app.get("/graph")
def graph(
    request: Request,
    _: None = Depends(_check_auth),
    max_nodes: Optional[int] = Query(
        default=None,
        ge=10,
        le=5000,
        description="Omit for full graph; set to cap nodes by activation (browser UI).",
    ),
    content_preview: int = Query(96, ge=0, le=500),
    session_id: Optional[str] = Query(
        default=None,
        description="When set, prefer nodes tied to this chat session (falls back to full graph if none match).",
    ),
    highlight: int = Query(
        0,
        ge=0,
        le=1,
        description="1 = mark nodes used as synthesis context for the last query in this session.",
    ),
    session_expand: int = Query(
        0,
        ge=0,
        le=3,
        description="When session_id is set, include this many hops of neighbors (substrate connectivity).",
    ),
    session_strict: int = Query(
        0,
        ge=0,
        le=1,
        description="1 = return empty graph when no session nodes match (no global fallback).",
    ),
) -> dict[str, Any]:
    """Graph JSON. Optional max_nodes caps by activation×base_strength for live UI."""
    rt = get_runtime(_tenant_from_request(request))
    return _build_graph_payload(
        rt,
        max_nodes=max_nodes,
        content_preview=content_preview,
        session_id=session_id,
        highlight=bool(highlight),
        session_expand=session_expand,
        session_strict=bool(session_strict),
    )


@limiter.limit("300/minute", key_func=_session_or_ip_key)
@app.get("/graph/stream")
async def graph_stream(
    request: Request,
    _: None = Depends(_check_auth),
    max_nodes: Optional[int] = Query(
        default=380,
        ge=10,
        le=5000,
    ),
    content_preview: int = Query(96, ge=0, le=500),
    session_id: Optional[str] = Query(default=None),
    highlight: int = Query(0, ge=0, le=1),
    session_expand: int = Query(0, ge=0, le=3),
    session_strict: int = Query(0, ge=0, le=1),
) -> StreamingResponse:
    """Server-Sent Events: periodic graph snapshots (same shape as GET /graph)."""

    async def event_gen() -> Any:
        tid = _tenant_from_request(request)
        try:
            while True:
                if await request.is_disconnected():
                    break
                rt = get_runtime(tid)
                payload = await asyncio.to_thread(
                    lambda r=rt: _build_graph_payload(
                        r,
                        max_nodes=max_nodes,
                        content_preview=content_preview,
                        session_id=session_id,
                        highlight=bool(highlight),
                        session_expand=session_expand,
                        session_strict=bool(session_strict),
                    )
                )
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(2.5)
        except asyncio.CancelledError:
            raise

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/graph/viz", response_class=HTMLResponse)
def graph_viz(_: None = Depends(_check_auth)) -> str:
    return r"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>BoggersTheAI Living Graph</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
  <style>
    body { margin: 0; font-family: sans-serif; background: #1a1a2e; color: #eee; }
    #cy { width: 100vw; height: 90vh; }
    #info { padding: 8px 20px; background: #16213e; font-size: 14px; }
    #details {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #16213e;
      padding: 15px;
      border-radius: 8px;
      max-width: 350px;
      display: none;
      z-index: 10;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="info">
    <b>BoggersTheAI Living Graph</b> | Click a node for details | Scroll to zoom |
    Drag to pan
  </div>
  <div id="cy"></div>
  <div id="details"></div>
  <script>
    async function load() {
      const _token = document.cookie.replace(
        /(?:(?:^|.*;\s*)boggers_token\s*=\s*([^;]*).*$)|^.*$/,
        "$1",
      );
      const _hdrs = _token ? { "Authorization": "Bearer " + _token } : {};
      const resp = await fetch("/graph", { headers: _hdrs });
      const data = await resp.json();
      const elements = [];
      data.nodes.forEach(n => {
        elements.push({
          data: {
            id: n.id,
            label: n.topics && n.topics[0] ? n.topics[0] : n.id.substring(0, 20),
            activation: n.activation || 0,
            stability: n.stability || 0,
            collapsed: n.collapsed || false,
            topics: (n.topics || []).join(", "),
          }
        });
      });
      data.edges.forEach((e, i) => {
        elements.push({
          data: { id: "e" + i, source: e.src, target: e.dst, weight: e.weight || 0.5 }
        });
      });
      const cy = cytoscape({
        container: document.getElementById("cy"),
        elements: elements,
        style: [
          { selector: "node", style: {
            "label": "data(label)",
            "width": "mapData(activation, 0, 1, 20, 60)",
            "height": "mapData(activation, 0, 1, 20, 60)",
            "background-color": "mapData(stability, 0, 1, #ff6b6b, #00d2ff)",
            "color": "#ddd", "font-size": "10px",
            "text-valign": "bottom", "text-halign": "center",
            "border-width": 1, "border-color": "#334",
          }},
          {
            selector: "node[?collapsed]",
            style: { "background-color": "#555", "opacity": 0.4 },
          },
          { selector: "edge", style: {
            "width": "mapData(weight, 0, 1, 0.5, 4)",
            "line-color": "#334", "curve-style": "bezier",
            "target-arrow-shape": "triangle", "target-arrow-color": "#445",
            "arrow-scale": 0.6,
          }},
        ],
        layout: {
          name: "cose",
          animate: false,
          nodeRepulsion: 8000,
          idealEdgeLength: 80,
        },
      });
      cy.on("tap", "node", function(evt) {
        const d = evt.target.data();
        const det = document.getElementById("details");
        det.style.display = "block";
        det.innerHTML = "<b>" + d.id + "</b><br>"
          + "Topics: " + d.topics + "<br>"
          + "Activation: " + (d.activation).toFixed(3) + "<br>"
          + "Stability: " + (d.stability).toFixed(3) + "<br>"
          + "Collapsed: " + d.collapsed;
      });
      cy.on("tap", function(evt) {
        if (evt.target === cy) {
          document.getElementById("details").style.display = "none";
        }
      });
    }
    load();
  </script>
</body>
</html>"""


@app.get("/metrics/prometheus", response_class=Response)
def metrics_prometheus(_: None = Depends(_check_auth)) -> Response:
    """Prometheus text exposition (scrape behind auth)."""
    lines: list[str] = []
    try:
        from BoggersTheAI.dashboard.wave13_routes import _load_agents

        depth = _load_agents().queue_depth()
    except Exception:
        depth = -1
    lines.append("# HELP boggers_agent_queue_depth Agent task queue depth")
    lines.append("# TYPE boggers_agent_queue_depth gauge")
    lines.append(f"boggers_agent_queue_depth {depth}")
    with _history_lock:
        tl = len(_tension_history)
    lines.append("# HELP boggers_tension_history_len Samples retained for dashboard chart")
    lines.append("# TYPE boggers_tension_history_len gauge")
    lines.append(f"boggers_tension_history_len {tl}")
    return Response(
        "\n".join(lines) + "\n",
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


@app.get("/metrics")
def metrics_endpoint(_: None = Depends(_check_auth)) -> dict[str, Any]:
    graph_metrics = get_runtime().graph.get_metrics()
    wave_status = get_runtime().get_status()

    stability_trend: list[float] = []
    with _history_lock:
        for entry in _tension_history[-50:]:
            stability_trend.append(1.0 - entry.get("tension", 0.0))

    return {
        "graph": graph_metrics,
        "wave": wave_status,
        "stability_trend": stability_trend,
        "tension_history_length": len(_tension_history),
        "system": metrics_collector.snapshot(),
    }


@app.get("/traces")
def traces(_: None = Depends(_check_auth), limit: int = 20) -> dict[str, Any]:
    traces_dir = Path("traces")
    if not traces_dir.exists():
        return {"traces": [], "count": 0}
    files = sorted(traces_dir.glob("*.jsonl"), reverse=True)[:limit]
    items = []
    for f in files:
        try:
            items.append(
                {"file": f.name, "content": f.read_text(encoding="utf-8").strip()}
            )
        except Exception:
            continue
    return {"traces": items, "count": len(items)}


class QueryBody(BaseModel):
    query: str = Field(min_length=1, max_length=8000)


@limiter.limit("90/minute", key_func=_session_or_ip_key)
@app.post("/query")
def post_query(
    request: Request,
    body: QueryBody,
    _: None = Depends(_check_auth),
    x_boggers_session_id: str | None = Header(
        default=None, alias="X-Boggers-Session-ID"
    ),
    x_boggers_tenant_id: str | None = Header(
        default=None, alias="X-Boggers-Tenant-ID"
    ),
) -> dict[str, Any]:
    """Programmatic query into the TS-OS pipeline (same as CLI `rt.ask`).

    Pass ``X-Boggers-Session-ID`` to isolate multi-turn chat history per browser tab.
    Pass ``X-Boggers-Tenant-ID`` for hard substrate isolation (separate graph + vault).
    """
    from BoggersTheAI.interface.api import handle_query

    return handle_query(
        {"query": body.query},
        client_session_id=x_boggers_session_id,
        tenant_id=x_boggers_tenant_id,
    )


@limiter.limit("30/minute", key_func=_session_or_ip_key)
@app.post("/query/stream")
def post_query_stream(
    request: Request,
    body: QueryBody,
    _: None = Depends(_check_auth),
    x_boggers_session_id: str | None = Header(
        default=None, alias="X-Boggers-Session-ID"
    ),
    x_boggers_tenant_id: str | None = Header(
        default=None, alias="X-Boggers-Tenant-ID"
    ),
) -> StreamingResponse:
    """SSE: graph phase(s) then token deltas — language surface separated from /graph/stream."""
    from BoggersTheAI.interface.api import handle_query_stream

    return StreamingResponse(
        handle_query_stream(
            {"query": body.query},
            client_session_id=x_boggers_session_id,
            tenant_id=x_boggers_tenant_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _register_wave13() -> None:
    from BoggersTheAI.dashboard.wave13_routes import register_wave13_routes

    # Wave 13: pass get_runtime so /distributed/shards and /distributed/tension
    # can read live shard stats directly from the graph's ShardedGraphLayer.
    register_wave13_routes(app, _check_auth, get_runtime_fn=get_runtime)


_register_wave13()


def main() -> None:
    import uvicorn

    # Default localhost-only; use BOGGERS_DASHBOARD_HOST=0.0.0.0 in production
    # behind a reverse proxy so the app listens on all interfaces explicitly.
    host = os.environ.get("BOGGERS_DASHBOARD_HOST", "127.0.0.1")
    port = int(os.environ.get("BOGGERS_DASHBOARD_PORT", "8000"))
    if not os.environ.get("BOGGERS_DASHBOARD_TOKEN"):
        _logger.warning("Dashboard running without authentication token")
    uvicorn.run("BoggersTheAI.dashboard.app:app", host=host, port=port, reload=False)
