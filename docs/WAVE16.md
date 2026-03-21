# Wave 16 — Multi-Agent Coordination

Official roadmap: **Multiple TS instances share a global graph layer. Agents negotiate activation via competitive edge weighting.**

## What was built

### 1. AgentRegistry — global shared state
**File:** [`core/agents/registry.py`](../backend/core/agents/registry.py)

- Redis-backed TTL heartbeats (120 s): dead agents auto-evict via `boggers:agents:index` SET + per-agent key TTL
- `negotiation_weight` starts at 0.5, climbs +0.05 on wins, decays −0.02 on losses
- Falls back to in-memory dict when Redis is unavailable
- 3 built-in agent perspectives seeded on startup: `explorer` (0.60), `consolidator` (0.50), `synthesizer` (0.55)

### 2. AgentNegotiator — tension-based bid protocol
**File:** [`core/agents/negotiation.py`](../backend/core/agents/negotiation.py)

Protocol per round:
1. Detect top-k tense nodes: `|activation − base_strength| > threshold`
2. Each active agent submits a bid: `amount = activation_budget × negotiation_weight × tension_score + jitter`
3. Winner = highest bid (lexicographic tie-break)
4. Winner: pushes activation to the node; edge weight to node +0.08
5. Losers: edge weight to node −0.04 (clamped to [0.05, 0.95])
6. Registry win/loss records updated → weights shift next round

Synthetic `agent:<id>` nodes are created in the live graph so agents participate in wave propagation as first-class citizens.

### 3. REST endpoints
**File:** [`dashboard/wave13_routes.py`](../backend/dashboard/wave13_routes.py)

| Route | Purpose |
|-------|---------|
| `GET /agents/list` | Active agents + negotiation weights, win rates |
| `POST /agents/register` | Register a new agent perspective at runtime |
| `POST /agents/negotiate` | Run one negotiation round using live graph tension |
| `GET /agents/dashboard` | HTML multi-agent dashboard (auto-refresh 5 s) |

### 4. Frontend MultiAgentPanel
**File:** [`frontend/src/components/sections/MultiAgentPanel.tsx`](../frontend/src/components/sections/MultiAgentPanel.tsx)

- Polls `GET /agents/list` every 4 s
- Shows live agent table: role, negotiation weight bar, wins/bids, win rate
- "Negotiate" button triggers one round and shows outcome log
- Graceful offline banner when Docker stack is down
- Wired into the `/waves` page alongside the roadmap nodes

## TS Logic

- **Tension as currency**: agents compete for the most unstable (high-tension) graph regions — the same signal that drives emergence in the wave engine
- **Competitive edge weighting**: agents that pick well-timed nodes repeatedly build stronger topological influence edges
- **Global graph layer**: the `agent:<id>` nodes in the live graph mean agent influence is part of the wave propagation, not separate from it
- **Wave engine unchanged**: negotiation is a post-tension hook, not a replacement for the wave cycle

## Testing

```bash
docker compose up -d --build

# Visit http://localhost:3000/waves → Multi-Agent section

# API:
curl http://localhost:8000/agents/list
# → {"agents":[{"agent_id":"explorer","role":"exploration","negotiation_weight":0.5,...}]}

# Run POST /query a few times to build graph tension, then:
curl -X POST http://localhost:8000/agents/negotiate
# → {"ok":true,"round":1,"contested_nodes":2,"results":[...]}

# Weights change after negotiation:
curl http://localhost:8000/agents/list
# → explorer.negotiation_weight: 0.55, others: 0.48

# HTML dashboard (auto-refreshes every 5s):
# http://localhost:8000/agents/dashboard
```

## Rollback

Set `REDIS_URL=` to disable Redis; agents use in-memory fallback. The negotiation routes are always registered but require ≥2 active agents and graph tension to produce results.
