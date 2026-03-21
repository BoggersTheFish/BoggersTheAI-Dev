from __future__ import annotations

"""
Wave 16 — AgentRegistry

Tracks every active agent in the multi-agent system with Redis-backed
TTL heartbeats so dead agents are automatically evicted.

TS Logic:
  Each agent represents a distinct reasoning perspective (explorer,
  consolidator, synthesizer …).  The registry is the shared global
  graph layer that lets multiple TS instances know who else is active
  and how influential they currently are (negotiation_weight).

  negotiation_weight starts at 0.5 and climbs with wins, decays with
  losses — so agents that consistently pick well-timed nodes gain
  stronger graph influence over time.

Redis layout:
  boggers:agents:state:<agent_id>  — HASH with all fields, TTL 120 s
  boggers:agents:index             — SET of currently-registered agent_ids
"""

import json
import logging
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger("boggers.agents.registry")

_STATE_PREFIX = "boggers:agents:state:"
_INDEX_KEY = "boggers:agents:index"
_HEARTBEAT_TTL = 120  # seconds before an agent is considered dead

try:
    import redis as _redis_lib  # type: ignore
except ImportError:
    _redis_lib = None  # type: ignore


@dataclass
class AgentState:
    """Live state of one registered agent."""

    agent_id: str
    role: str
    activation_budget: float  # 0–1, how much activation the agent can push per bid
    negotiation_weight: float = 0.5  # 0–1, updated by win/loss history
    last_seen: float = field(default_factory=time.time)
    wins: int = 0
    total_bids: int = 0

    @property
    def win_rate(self) -> float:
        if self.total_bids == 0:
            return 0.0
        return round(self.wins / self.total_bids, 4)

    def to_dict(self) -> dict[str, Any]:
        return {
            **asdict(self),
            "win_rate": self.win_rate,
            "age_seconds": round(time.time() - self.last_seen, 1),
        }


class AgentRegistry:
    """
    Wave 16 — shared global agent registry.

    When a Redis client is provided, state is stored with TTL so dead agents
    are evicted automatically.  Falls back to in-memory dict for single-instance
    development.

    TS Logic: The registry is the "global graph layer" that all TS instances
    share — it tells each agent who else is active and how their negotiation
    weights compare, enabling competitive edge weighting in the negotiation round.
    """

    def __init__(self, redis_client: Any = None) -> None:
        self._redis = redis_client
        self._local: Dict[str, AgentState] = {}

    # ------------------------------------------------------------------
    # Registration & heartbeats
    # ------------------------------------------------------------------

    def register(
        self,
        agent_id: str,
        role: str,
        activation_budget: float = 0.5,
    ) -> AgentState:
        """Register or refresh an agent.  Returns the current AgentState."""
        existing = self._load(agent_id)
        if existing:
            existing.last_seen = time.time()
            self._save(existing)
            return existing

        state = AgentState(
            agent_id=agent_id,
            role=role,
            activation_budget=max(0.0, min(1.0, activation_budget)),
        )
        self._save(state)
        logger.info(
            "Wave 16: agent registered — id=%s role=%s budget=%.2f",
            agent_id,
            role,
            activation_budget,
        )
        return state

    def heartbeat(self, agent_id: str) -> None:
        """Refresh the TTL for a living agent."""
        state = self._load(agent_id)
        if state:
            state.last_seen = time.time()
            self._save(state)

    def get_active(self, max_age_seconds: float = _HEARTBEAT_TTL) -> List[AgentState]:
        """Return all agents seen within max_age_seconds."""
        all_agents = self._load_all()
        cutoff = time.time() - max_age_seconds
        return [a for a in all_agents if a.last_seen >= cutoff]

    # ------------------------------------------------------------------
    # Win / loss tracking (drives negotiation_weight)
    # ------------------------------------------------------------------

    def record_win(self, agent_id: str) -> None:
        """Called when this agent wins a negotiation round.  Boosts weight."""
        state = self._load(agent_id)
        if not state:
            return
        state.wins += 1
        state.total_bids += 1
        # Boost weight — converges toward 0.9 with consistent winning
        state.negotiation_weight = min(
            0.9, state.negotiation_weight + 0.05
        )
        self._save(state)

    def record_loss(self, agent_id: str) -> None:
        """Called when this agent loses a negotiation round.  Decays weight."""
        state = self._load(agent_id)
        if not state:
            return
        state.total_bids += 1
        # Decay weight — converges toward 0.1 with consistent losing
        state.negotiation_weight = max(
            0.1, state.negotiation_weight - 0.02
        )
        self._save(state)

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    def snapshot(self) -> List[dict[str, Any]]:
        """Return all active agents as a list of dicts for API/dashboard."""
        return [a.to_dict() for a in self.get_active()]

    def agent_count(self) -> int:
        return len(self.get_active())

    # ------------------------------------------------------------------
    # Redis / in-memory storage
    # ------------------------------------------------------------------

    def _save(self, state: AgentState) -> None:
        if self._redis is not None:
            try:
                key = f"{_STATE_PREFIX}{state.agent_id}"
                self._redis.setex(
                    key,
                    _HEARTBEAT_TTL,
                    json.dumps(asdict(state)),
                )
                self._redis.sadd(_INDEX_KEY, state.agent_id)
            except Exception as exc:
                logger.debug("AgentRegistry Redis save failed: %s", exc)
                self._local[state.agent_id] = state
        else:
            self._local[state.agent_id] = state

    def _load(self, agent_id: str) -> Optional[AgentState]:
        if self._redis is not None:
            try:
                key = f"{_STATE_PREFIX}{agent_id}"
                raw = self._redis.get(key)
                if raw:
                    return AgentState(**json.loads(raw))
            except Exception as exc:
                logger.debug("AgentRegistry Redis load failed: %s", exc)
        return self._local.get(agent_id)

    def _load_all(self) -> List[AgentState]:
        if self._redis is not None:
            try:
                ids = self._redis.smembers(_INDEX_KEY)
                agents = []
                for aid in ids:
                    raw = self._redis.get(f"{_STATE_PREFIX}{aid}")
                    if raw:
                        agents.append(AgentState(**json.loads(raw)))
                    else:
                        # TTL expired — clean from index
                        self._redis.srem(_INDEX_KEY, aid)
                return agents
            except Exception as exc:
                logger.debug("AgentRegistry Redis load_all failed: %s", exc)
        return list(self._local.values())
