# CLEAN RESPONSE LAYER — Wave 14 Production Fix
# Returns only natural text for the Lab page while keeping full TS-OS intact

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Protocol

from .synthesis_engine import BoggersSynthesisEngine


class SynthesisProtocol(Protocol):
    def synthesize(self, context: str, query: str) -> str: ...


@dataclass(slots=True)
class ThrottlePolicy:
    min_interval_seconds: float = 60.0


def clean_lab_response(text: str) -> str:
    """
    Final pass for HTTP /query and inference output: remove debug artifacts so the Lab
    never shows internal TS-OS plumbing to end users.
    """
    if not text or not str(text).strip():
        return (
            "I'm not sure how to help with that yet—try asking in a different way."
        )
    s = str(text).replace("\r\n", "\n")
    lines: list[str] = []
    for line in s.splitlines():
        t = line.strip()
        lower = t.lower()
        if not t:
            continue
        if "[node:" in t or "[throttle]" in lower:
            continue
        if "grounded synthesis" in lower:
            continue
        if "topic=calc" in lower:
            continue
        if "calculation failed" in lower:
            continue
        if lower.startswith("session "):
            continue
        if "conversation history:" in lower:
            continue
        if "reused previous synthesis" in lower:
            continue
        if "source: retrieved graph context only" in lower:
            continue
        lines.append(line)

    out = "\n".join(lines) if lines else ""
    out = re.sub(r"\[node:[^\]]+\]", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\[throttle\][^\n]*", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\[tool:[^\]]+\]", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\b[a-f0-9]{32,40}\b", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\s+", " ", out).strip()
    if len(out) > 1200:
        out = out[:1200].rsplit(" ", 1)[0] + "…"
    if not out:
        return "I couldn't put that into words just now—want to try again?"
    return out


class InferenceRouter:
    """
    Lightweight inference router with throttle and fallback.

    - primary: usually local synthesis engine
    - fallback: optional remote/API engine
    - throttle: limit expensive synthesis calls
    """

    def __init__(
        self,
        primary: SynthesisProtocol | None = None,
        fallback: SynthesisProtocol | None = None,
        throttle: ThrottlePolicy | None = None,
    ) -> None:
        self.primary = primary or BoggersSynthesisEngine()
        self.fallback = fallback
        self.throttle = throttle or ThrottlePolicy()
        self._last_call_time = 0.0
        self._last_result = ""

    def synthesize(self, context: str, query: str) -> str:
        now = time.time()
        if self._is_throttled(now) and self._last_result:
            return self._last_result

        try:
            result = self.primary.synthesize(context, query)
        except Exception:  # pragma: no cover - defensive fallback path
            if self.fallback is None:
                result = "I'm having trouble answering that right now—please try again."
            else:
                result = self.fallback.synthesize(context, query)

        self._last_call_time = now
        self._last_result = clean_lab_response(result)
        return self._last_result

    def _is_throttled(self, now: float) -> bool:
        elapsed = now - self._last_call_time
        return elapsed < float(self.throttle.min_interval_seconds)
