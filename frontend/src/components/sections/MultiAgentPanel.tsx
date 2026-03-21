"use client";

/**
 * Wave 16 — MultiAgentPanel
 *
 * Live dashboard widget showing the multi-agent coordination layer.
 * Polls GET /api/boggers/agents/list every 4 seconds.
 * Sends POST /api/boggers/agents/negotiate on demand.
 *
 * TS Logic:
 *   - Each agent = a reasoning perspective (explorer, consolidator, synthesizer)
 *   - Negotiation rounds use wave tension as currency
 *   - Win rates drive negotiation_weight → competitive edge weighting in the graph
 *   - The panel visualises which agents are winning influence over the graph
 */

import { useCallback, useEffect, useState } from "react";
import { Users, Zap, RefreshCw, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { boggersUrl, getSessionHeaders } from "@/lib/boggersApi";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentData {
  agent_id: string;
  role: string;
  activation_budget: number;
  negotiation_weight: number;
  wins: number;
  total_bids: number;
  win_rate: number;
  age_seconds: number;
}

interface NegotiationOutcome {
  node_id: string;
  winner: string;
  winning_amount: number;
  tension_score: number;
  competing_agents: number;
  activation_before: number;
  activation_after: number;
}

interface AgentsListResponse {
  agents: AgentData[];
  agent_count: number;
  negotiation_rounds: number;
}

interface NegotiateResponse {
  ok: boolean;
  round: number;
  contested_nodes: number;
  results: NegotiationOutcome[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weightBar(weight: number) {
  const pct = Math.round(weight * 100);
  const color =
    pct > 70 ? "bg-ts-purple" : pct > 40 ? "bg-yellow-400/70" : "bg-red-500/60";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

function liveness(age: number) {
  if (age < 30) return <span className="text-green-400 text-[10px]">●</span>;
  if (age < 90) return <span className="text-yellow-400 text-[10px]">●</span>;
  return <span className="text-red-500 text-[10px]">●</span>;
}

const ROLE_COLORS: Record<string, string> = {
  exploration:   "border-ts-purple/40 text-ts-purple-light",
  consolidation: "border-blue-400/40 text-blue-300",
  synthesis:     "border-green-400/40 text-green-300",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MultiAgentPanel() {
  const [data, setData] = useState<AgentsListResponse | null>(null);
  const [outcomes, setOutcomes] = useState<NegotiationOutcome[]>([]);
  const [roundCount, setRoundCount] = useState(0);
  const [negotiating, setNegotiating] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  const fetchAgents = useCallback(async () => {
    try {
      const r = await fetch(boggersUrl("/agents/list"), {
        headers: { ...getSessionHeaders() },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) throw new Error("not ok");
      const d: AgentsListResponse = await r.json();
      setData(d);
      setRoundCount(d.negotiation_rounds);
      setOffline(false);
      setLastRefresh(Date.now());
    } catch {
      setOffline(true);
    }
  }, []);

  const triggerNegotiate = useCallback(async () => {
    if (negotiating) return;
    setNegotiating(true);
    try {
      const r = await fetch(boggersUrl("/agents/negotiate"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getSessionHeaders() },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const d: NegotiateResponse = await r.json();
        if (d.ok && d.results?.length) {
          setOutcomes((prev) => [...d.results, ...prev].slice(0, 8));
          setRoundCount(d.round);
        }
        await fetchAgents();
      }
    } catch {
      // backend may be offline; panel shows gracefully
    } finally {
      setNegotiating(false);
    }
  }, [negotiating, fetchAgents]);

  // Poll every 4s
  useEffect(() => {
    fetchAgents();
    const id = setInterval(fetchAgents, 4000);
    return () => clearInterval(id);
  }, [fetchAgents]);

  const agents = data?.agents ?? [];

  return (
    <div className="ts-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ts-purple/20 bg-ts-purple/5">
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-3.5 h-3.5 text-ts-purple" />
          <span className="text-xs font-mono text-ts-purple-light">Wave 16 — Multi-Agent</span>
          {!offline && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {agents.length} agents · round #{roundCount}
            </span>
          )}
          {offline && (
            <Badge variant="outline" className="text-[9px] border-orange-400/40 text-orange-400 flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              offline
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={fetchAgents} className="h-6 px-1.5 text-xs">
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={triggerNegotiate}
            disabled={negotiating || offline}
            className="h-6 px-2 text-[10px] gap-1"
          >
            <Play className="w-2.5 h-2.5" />
            {negotiating ? "…" : "Negotiate"}
          </Button>
        </div>
      </div>

      {offline ? (
        <div className="p-5 text-center text-xs text-muted-foreground">
          <AlertCircle className="w-8 h-8 text-orange-400/50 mx-auto mb-2" />
          Backend offline — start Docker to see live agents.
          <br />
          <span className="text-[10px] opacity-60">GET /agents/list requires the FastAPI server.</span>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {/* Agent table */}
          {agents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No agents registered yet. Start Docker or POST /agents/register.
            </p>
          ) : (
            <div className="space-y-1.5">
              {agents.map((a) => (
                <div
                  key={a.agent_id}
                  className={cn(
                    "flex items-center gap-2 rounded px-2 py-1.5 border bg-black/30",
                    ROLE_COLORS[a.role] ?? "border-white/10 text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-1 w-28 flex-shrink-0">
                    {liveness(a.age_seconds)}
                    <span className="text-[11px] font-mono font-semibold truncate">{a.agent_id}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground w-20 flex-shrink-0 truncate">{a.role}</span>
                  <div className="flex-1 min-w-0">{weightBar(a.negotiation_weight)}</div>
                  <span className="text-[9px] font-mono text-muted-foreground w-14 text-right flex-shrink-0">
                    {a.wins}/{a.total_bids} wins
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Negotiation outcomes */}
          {outcomes.length > 0 && (
            <div className="border border-ts-purple/15 rounded p-2 bg-black/40 space-y-0.5">
              <div className="text-[9px] text-muted-foreground font-mono mb-1 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-ts-purple" />
                Recent negotiation outcomes
              </div>
              {outcomes.map((o, i) => (
                <div key={i} className="text-[10px] font-mono flex items-center gap-2">
                  <span className="text-muted-foreground/50 w-5">#{i + 1}</span>
                  <span className="text-ts-purple-light truncate max-w-[100px]">{o.winner}</span>
                  <span className="text-muted-foreground">won</span>
                  <span className="text-white truncate max-w-[80px]">{o.node_id}</span>
                  <span className="text-muted-foreground/60 ml-auto">⚡{(o.tension_score * 100).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <p className="text-[9px] text-muted-foreground/50 font-mono">
            Weight bar = negotiation influence. Click Negotiate to run one round using live graph tension.
          </p>
        </div>
      )}
    </div>
  );
}
