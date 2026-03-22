from __future__ import annotations

import logging
import os
import threading
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from BoggersTheAI import BoggersRuntime
from BoggersTheAI.core.metrics import metrics as metrics_collector

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
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SessionLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_runtime: BoggersRuntime | None = None
_runtime_lock = threading.Lock()


def get_runtime() -> BoggersRuntime:
    global _runtime
    if _runtime is None:
        with _runtime_lock:
            if _runtime is None:
                _runtime = BoggersRuntime()
    return _runtime


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


@app.get("/graph")
def graph(_: None = Depends(_check_auth)) -> dict[str, Any]:
    nodes = [
        {
            "id": n.id,
            "topics": n.topics,
            "activation": n.activation,
            "stability": n.stability,
            "collapsed": n.collapsed,
        }
        for n in get_runtime().graph.nodes.values()
    ]
    edges = [
        {"src": e.src, "dst": e.dst, "weight": e.weight}
        for e in get_runtime().graph.edges
    ]
    return {"nodes": nodes, "edges": edges}


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
) -> dict[str, Any]:
    """Programmatic query into the TS-OS pipeline (same as CLI `rt.ask`).

    Pass ``X-Boggers-Session-ID`` to isolate multi-turn chat history per browser tab.
    """
    from BoggersTheAI.interface.api import handle_query

    return handle_query(
        {"query": body.query},
        client_session_id=x_boggers_session_id,
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
