# CLEAN RESPONSE LAYER — Wave 14 Production Fix
# Returns only natural text for the Lab page while keeping full TS-OS intact

from __future__ import annotations

import logging
import threading
from typing import Any, Dict

from ..entities.inference_router import clean_lab_response
from .runtime import BoggersRuntime

logger = logging.getLogger("boggers.api")

_shared_runtime: BoggersRuntime | None = None
_runtime_lock = threading.Lock()


def get_runtime() -> BoggersRuntime:
    global _shared_runtime
    if _shared_runtime is not None:
        return _shared_runtime
    with _runtime_lock:
        if _shared_runtime is None:
            _shared_runtime = BoggersRuntime()
        return _shared_runtime


def handle_query(
    payload: Dict[str, Any],
    runtime: BoggersRuntime | None = None,
    client_session_id: str | None = None,
) -> Dict[str, Any]:
    rt = runtime or get_runtime()
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
    return out


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
