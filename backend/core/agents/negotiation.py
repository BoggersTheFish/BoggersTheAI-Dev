from __future__ import annotations

"""
Wave 16 — AgentNegotiator

Implements the multi-agent negotiation protocol using wave tension as
the activation currency.

Protocol per negotiation round:
  1. Get top-k tense nodes from the live graph (tension = |act − base|)
  2. Each active agent submits a bid for each contested node:
       bid_amount = activation_budget × negotiation_weight × tension_score
  3. Winner = agent with the highest bid (ties broken by agent_id lexicographic order)
  4. Apply: winner pushes activation +bid_amount to the graph node
  5. Update graph edge weights for the winner (+0.08) and losers (−0.04),
     clamped to [0.05, 0.95] so no agent can monopolise or be shut out
  6. Update negotiation_weight via AgentRegistry (win/loss record)

TS Logic:
  Tension drives which nodes get contested — the most unstable nodes are the
  ones agents fight over, mirroring how the wave engine prioritises high-tension
  regions for emergence and activation.

  Competitive edge weighting means that repeatedly-winning agents build stronger
  graph influence edges, making their future bids more effective.  Losers'
  edges decay so the graph doesn't become dominated by a single perspective.

  The negotiation round can be triggered manually (POST /agents/negotiate) or
  wired into the wave cycle as a post-tension hook.
"""

import logging
import random
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable, Dict, List, Optional

from .registry import AgentRegistry, AgentState

if TYPE_CHECKING:
    from ..graph.universal_living_graph import UniversalLivingGraph

logger = logging.getLogger("boggers.agents.negotiation")

_EDGE_BOOST_WIN = 0.08
_EDGE_DECAY_LOSS = 0.04
_EDGE_MIN = 0.05
_EDGE_MAX = 0.95
_ACTIVATION_PUSH_CAP = 0.4   # max per bid to prevent runaway activation
_BID_JITTER = 0.02            # small random noise to break symmetric ties


@dataclass
class AgentBid:
    """A single agent's bid on a contested node."""

    agent_id: str
    node_id: str
    amount: float        # activation push amount if this bid wins
    tension_score: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class NegotiationResult:
    """Outcome of one negotiation for one contested node."""

    node_id: str
    winner_agent_id: str
    winning_amount: float
    tension_score: float
    competing_agents: int
    edge_weight_delta: float  # applied to winner's conceptual edge to this node
    activation_before: float
    activation_after: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "node_id": self.node_id,
            "winner": self.winner_agent_id,
            "winning_amount": round(self.winning_amount, 4),
            "tension_score": round(self.tension_score, 4),
            "competing_agents": self.competing_agents,
            "edge_weight_delta": round(self.edge_weight_delta, 4),
            "activation_before": round(self.activation_before, 4),
            "activation_after": round(self.activation_after, 4),
        }


class AgentNegotiator:
    """
    Wave 16 — runs negotiation rounds between active agents.

    One instance is created per runtime and shared across the agent routes.
    It holds a reference to the AgentRegistry and the live graph (injected
    via the get_runtime_fn callback at call time to avoid circular imports).

    TS Logic:
      The negotiator is the coordination layer that converts wave tension into
      competitive agent behaviour.  Tension = instability = opportunity — agents
      race to activate the most unstable nodes, gaining graph influence as reward.
    """

    def __init__(self, registry: AgentRegistry) -> None:
        self._registry = registry
        self._results_log: List[NegotiationResult] = []
        self._round_count = 0

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run_round(
        self,
        graph: "UniversalLivingGraph",
        top_k: int = 3,
    ) -> List[NegotiationResult]:
        """
        Run one negotiation round.

        1. Find top-k tense nodes in the live graph.
        2. Each active agent bids on each node.
        3. Resolve winner per node; apply activation + edge updates.
        4. Update registry win/loss records.
        5. Return list of NegotiationResult.
        """
        agents = self._registry.get_active()
        if len(agents) < 2:
            logger.debug(
                "Wave 16: negotiation skipped — need ≥ 2 agents, have %d", len(agents)
            )
            return []

        tensions = graph.detect_tensions()
        if not tensions:
            logger.debug("Wave 16: negotiation skipped — no tension detected")
            return []

        # Pick top-k contested nodes by tension score
        top_nodes = sorted(tensions.items(), key=lambda kv: -kv[1])[:top_k]
        results: List[NegotiationResult] = []

        for node_id, tension_score in top_nodes:
            node = graph.get_node(node_id)
            if node is None or node.collapsed:
                continue

            bids = self._build_bids(agents, node_id, tension_score)
            if not bids:
                continue

            winner_bid = self._resolve(bids)
            activation_before = node.activation

            # Apply: push activation to the contested node
            push = min(_ACTIVATION_PUSH_CAP, winner_bid.amount)
            graph.update_activation(node_id, push)
            activation_after = graph.get_node(node_id).activation  # type: ignore[union-attr]

            # Update competitive edge weights
            edge_delta = self._update_edges(
                graph, winner_bid.agent_id, node_id,
                [b.agent_id for b in bids if b.agent_id != winner_bid.agent_id],
            )

            # Record win/loss in registry
            self._registry.record_win(winner_bid.agent_id)
            for bid in bids:
                if bid.agent_id != winner_bid.agent_id:
                    self._registry.record_loss(bid.agent_id)

            result = NegotiationResult(
                node_id=node_id,
                winner_agent_id=winner_bid.agent_id,
                winning_amount=push,
                tension_score=tension_score,
                competing_agents=len(bids),
                edge_weight_delta=edge_delta,
                activation_before=activation_before,
                activation_after=activation_after,
            )
            results.append(result)
            logger.info(
                "Wave 16: negotiation round — node=%s winner=%s bid=%.3f "
                "tension=%.3f competitors=%d",
                node_id,
                winner_bid.agent_id,
                push,
                tension_score,
                len(bids),
            )

        self._round_count += 1
        self._results_log = (results + self._results_log)[:50]  # keep last 50
        return results

    # ------------------------------------------------------------------
    # Bid construction and resolution
    # ------------------------------------------------------------------

    def _build_bids(
        self,
        agents: List[AgentState],
        node_id: str,
        tension_score: float,
    ) -> List[AgentBid]:
        """
        Each agent submits a bid = activation_budget × negotiation_weight × tension.
        Small jitter prevents trivial tie-breaks from always favouring the same agent.
        """
        bids: List[AgentBid] = []
        for agent in agents:
            base = agent.activation_budget * agent.negotiation_weight * tension_score
            amount = max(0.01, base + random.uniform(-_BID_JITTER, _BID_JITTER))
            bids.append(AgentBid(
                agent_id=agent.agent_id,
                node_id=node_id,
                amount=min(_ACTIVATION_PUSH_CAP, amount),
                tension_score=tension_score,
            ))
        return bids

    def _resolve(self, bids: List[AgentBid]) -> AgentBid:
        """Winner = highest bid amount.  Lexicographic tie-break on agent_id."""
        return max(bids, key=lambda b: (b.amount, b.agent_id))

    # ------------------------------------------------------------------
    # Competitive edge weight updates
    # ------------------------------------------------------------------

    def _update_edges(
        self,
        graph: "UniversalLivingGraph",
        winner_id: str,
        node_id: str,
        loser_ids: List[str],
    ) -> float:
        """
        Boost the winner's graph-edge relationship to the contested node,
        weaken losers'.  We store agent→node edges in the graph under the
        synthetic node id 'agent:<agent_id>' so the wave engine can propagate
        through them.

        TS Logic: competitive edge weighting means that agents who win
        consistently build stronger topological influence in the graph.
        """
        winner_agent_node = f"agent:{winner_id}"
        self._ensure_agent_node(graph, winner_id)

        # Try to boost or create winner → contested edge
        delta = 0.0
        with graph._lock:
            adj = graph._adjacency.get(winner_agent_node, {})
            current = adj.get(node_id, 0.5)
            new_weight = min(_EDGE_MAX, current + _EDGE_BOOST_WIN)
            adj[node_id] = new_weight
            graph._adjacency[winner_agent_node] = adj
            delta = new_weight - current

        # Decay loser edges
        for loser_id in loser_ids:
            loser_agent_node = f"agent:{loser_id}"
            self._ensure_agent_node(graph, loser_id)
            with graph._lock:
                adj_l = graph._adjacency.get(loser_agent_node, {})
                cur_l = adj_l.get(node_id, 0.5)
                adj_l[node_id] = max(_EDGE_MIN, cur_l - _EDGE_DECAY_LOSS)
                graph._adjacency[loser_agent_node] = adj_l

        return delta

    def _ensure_agent_node(
        self, graph: "UniversalLivingGraph", agent_id: str
    ) -> None:
        """Create a synthetic agent node if it doesn't yet exist in the graph."""
        nid = f"agent:{agent_id}"
        if graph.get_node(nid) is None:
            graph.add_node(
                node_id=nid,
                content=f"Agent perspective: {agent_id}",
                topics=["agent", "multi_agent"],
                activation=0.3,
                stability=0.7,
                base_strength=0.4,
                attributes={"type": "agent", "agent_id": agent_id},
            )

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    @property
    def round_count(self) -> int:
        return self._round_count

    def recent_results(self, n: int = 10) -> List[dict[str, Any]]:
        return [r.to_dict() for r in self._results_log[:n]]

    def status(self) -> dict[str, Any]:
        return {
            "round_count": self._round_count,
            "active_agents": self._registry.agent_count(),
            "recent_results": self.recent_results(5),
        }
