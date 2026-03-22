# CLEAN RESPONSE LAYER — Wave 14 Production Fix
# Returns only natural text for the Lab page while keeping full TS-OS intact

from __future__ import annotations

import json
import logging
import re
import threading
from typing import Any, Dict, Iterator, Optional

from ..entities.inference_router import clean_lab_response
from .runtime import BoggersRuntime

logger = logging.getLogger("boggers.api")

_shared_runtime: Optional[BoggersRuntime] = None
_tenant_runtimes: dict[str, BoggersRuntime] = {}
_runtime_lock = threading.Lock()


def _sanitize_tenant_id(tenant_id: str | None) -> str | None:
    if not tenant_id or not str(tenant_id).strip():
        return None
    s = re.sub(r"[^a-zA-Z0-9._-]", "", str(tenant_id).strip())[:64]
    return s or None


def get_runtime(tenant_id: str | None = None) -> BoggersRuntime:
    """Lazy runtime(s). Default substrate is shared; each tenant gets an isolated graph + vault."""
    tid = _sanitize_tenant_id(tenant_id)
    global _shared_runtime
    with _runtime_lock:
        if not tid:
            if _shared_runtime is None:
                _shared_runtime = BoggersRuntime()
            return _shared_runtime
        if tid not in _tenant_runtimes:
            _tenant_runtimes[tid] = BoggersRuntime(tenant_id=tid)
        return _tenant_runtimes[tid]


def handle_query(
    payload: Dict[str, Any],
    runtime: BoggersRuntime | None = None,
    client_session_id: str | None = None,
    tenant_id: str | None = None,
) -> Dict[str, Any]:
    rt = runtime or get_runtime(tenant_id)
    query = str(payload.get("query", "")).strip()
    if not query:
        return {"ok": False, "error": "query is required"}
    sid = (client_session_id or "").strip()[:128] or None
    try:
        response = rt.ask(query, client_session_id=sid)
    except Exception as exc:
        logger.error("Query failed: %s", exc)
        return {
            "ok": False,
            "error": _friendly_http_error(str(exc)),
        }
    answer = clean_lab_response(response.answer)
    out: Dict[str, Any] = {"ok": True, "answer": answer}
    if sid:
        out["session_id"] = sid
    if tenant_id and _sanitize_tenant_id(tenant_id):
        out["tenant_id"] = _sanitize_tenant_id(tenant_id)
    return out


def handle_query_stream(
    payload: Dict[str, Any],
    runtime: BoggersRuntime | None = None,
    client_session_id: str | None = None,
    tenant_id: str | None = None,
) -> Iterator[str]:
    """SSE lines: phase (graph) → token deltas → done (no graph in /graph channel)."""
    rt = runtime or get_runtime(tenant_id)
    query = str(payload.get("query", "")).strip()
    if not query:
        yield _sse_line({"type": "error", "ok": False, "message": "query is required"})
        return
    sid = (client_session_id or "").strip()[:128] or None
    try:
        for ev in rt.stream_ask(query, client_session_id=sid):
            if not isinstance(ev, dict):
                continue
            if ev.get("type") == "error" and "ok" not in ev:
                ev = {**ev, "ok": False}
            if ev.get("type") == "done" and "response" in ev:
                r = ev["response"]
                if hasattr(r, "answer"):
                    ev = {
                        "type": "done",
                        "ok": True,
                        "answer": clean_lab_response(r.answer),
                        "path_node_ids": list(getattr(r, "path_node_ids", []) or []),
                        "session_id": sid,
                    }
                    tid = _sanitize_tenant_id(tenant_id)
                    if tid:
                        ev["tenant_id"] = tid
            yield _sse_line(ev)
    except Exception as exc:
        logger.error("Stream query failed: %s", exc)
        yield _sse_line(
            {"type": "error", "ok": False, "message": _friendly_http_error(str(exc))}
        )


def _sse_line(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _friendly_http_error(raw: str) -> str:
    cleaned = clean_lab_response(raw)
    lower = cleaned.lower()
    if any(
        x in lower
        for x in (
            "traceback",
            "exception",
            "keyerror",
            "attributeerror",
            "runtimeerror",
        )
    ):
        return "Something went wrong—please try again in a moment."
    return cleaned if cleaned else "Something went wrong—please try again in a moment."
