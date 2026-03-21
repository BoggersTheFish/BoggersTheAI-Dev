# CLEAN RESPONSE LAYER — Wave 14 Production Fix
# Returns only natural text for the Lab page while keeping full TS-OS intact

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import List


@dataclass(slots=True)
class BoggersSynthesisConfig:
    max_context_chars: int = 8000
    max_sentences: int = 4
    ollama_model: str = "llama3.2"


def _ollama_hosts() -> list[str]:
    env = os.environ.get("OLLAMA_BASE_URL", "").strip()
    if env:
        return [env.rstrip("/")]
    return [
        "http://ollama:11434",
        "http://127.0.0.1:11434",
        "http://localhost:11434",
    ]


def _strip_graph_context_metadata(context: str) -> str:
    """Remove [node:...] lines and metadata rows; keep human-readable content only."""
    lines: List[str] = []
    for line in context.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("[node:"):
            continue
        if re.match(r"^topic=.*activation=", s):
            continue
        lines.append(s)
    return "\n".join(lines)


def _extractive_reply(clean_body: str, query: str) -> str:
    """Short, natural summary from retrieved text — no debug phrasing."""
    text = clean_body.replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return (
            "I'm still gathering thoughts on that—could you ask in a slightly different way?"
        )
    sentences = re.split(r"(?<=[.!?])\s+", text)
    picked = [s.strip() for s in sentences if s.strip()][:3]
    if picked:
        out = " ".join(picked)
    else:
        out = text[:400] + ("…" if len(text) > 400 else "")
    if len(out) > 900:
        out = out[:900].rsplit(" ", 1)[0] + "…"
    return out


class BoggersSynthesisEngine:
    """
    Single-purpose synthesis engine.

    Contract:
        synthesize(context: str, query: str) -> str
    """

    def __init__(self, config: BoggersSynthesisConfig | None = None) -> None:
        self.config = config or BoggersSynthesisConfig()

    def _try_ollama(self, host: str, clean_body: str, query: str) -> str | None:
        try:
            import ollama
        except ImportError:
            return None
        model = os.environ.get("OLLAMA_MODEL", self.config.ollama_model)
        try:
            client = ollama.Client(host=host)
            user_block = (
                f"Question: {query}\n\n"
                f"Notes to use (ignore any labels; answer naturally):\n{clean_body[:6000]}"
            )
            r = client.chat(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful, friendly assistant. Reply in 1–3 short, natural "
                            "sentences. Be conversational; you may be lightly witty when it fits. "
                            "Never output node IDs, bracket tags, stack traces, 'topic=', "
                            "'activation=', 'Session', or internal system labels."
                        ),
                    },
                    {"role": "user", "content": user_block},
                ],
                options={"temperature": 0.45, "num_predict": 256},
            )
            msg = (r.get("message") or {}).get("content", "")
            out = str(msg).strip()
            return out or None
        except Exception:
            return None

    def synthesize(self, context: str, query: str) -> str:
        normalized = (context or "").strip()
        if not normalized:
            return (
                "I don't have enough to go on yet—try rephrasing or adding a bit more detail."
            )

        clipped = normalized[: self.config.max_context_chars]
        clean_body = _strip_graph_context_metadata(clipped).strip()
        if not clean_body:
            return (
                "I don't have enough to go on yet—try rephrasing or adding a bit more detail."
            )

        for host in _ollama_hosts():
            ollama_out = self._try_ollama(host, clean_body, query)
            if ollama_out:
                return ollama_out

        return _extractive_reply(clean_body, query)
