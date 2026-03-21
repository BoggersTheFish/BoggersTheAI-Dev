"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, RefreshCw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { boggersUrl, getSessionHeaders } from "@/lib/boggersApi";
import { clamp, lerp } from "@/lib/utils";

interface SimNode {
  id: string;
  label: string;
  activation: number;
  baseStrength: number;
  x: number;
  y: number;
  edges: string[];
}

interface SimEdge {
  from: string;
  to: string;
  weight: number;
}

const INITIAL_NODES: SimNode[] = [
  { id: "core", label: "TS Core", activation: 0.9, baseStrength: 0.8, x: 50, y: 50, edges: ["ai", "memory", "wave"] },
  { id: "ai", label: "LLM", activation: 0.6, baseStrength: 0.5, x: 20, y: 25, edges: ["core", "self-improve"] },
  { id: "memory", label: "Memory", activation: 0.5, baseStrength: 0.45, x: 80, y: 25, edges: ["core"] },
  { id: "wave", label: "Wave Cycle", activation: 0.75, baseStrength: 0.65, x: 50, y: 15, edges: ["core", "ai", "memory"] },
  { id: "self-improve", label: "Self-Improve", activation: 0.4, baseStrength: 0.35, x: 20, y: 75, edges: ["ai", "core"] },
  { id: "output", label: "Output", activation: 0.3, baseStrength: 0.25, x: 80, y: 75, edges: ["core", "memory"] },
  { id: "visitor", label: "You", activation: 0.15, baseStrength: 0.1, x: 50, y: 85, edges: ["core", "output"] },
];

const EDGES: SimEdge[] = [
  { from: "core", to: "ai", weight: 0.8 },
  { from: "core", to: "memory", weight: 0.75 },
  { from: "core", to: "wave", weight: 0.9 },
  { from: "ai", to: "self-improve", weight: 0.7 },
  { from: "wave", to: "ai", weight: 0.65 },
  { from: "wave", to: "memory", weight: 0.6 },
  { from: "core", to: "output", weight: 0.7 },
  { from: "memory", to: "output", weight: 0.55 },
  { from: "core", to: "visitor", weight: 0.3 },
  { from: "output", to: "visitor", weight: 0.25 },
];

type LiveStatus = {
  tension: number;
  cycle: number;
  nodes: number;
  edges: number;
};

export function TSMiniSim() {
  const [nodes, setNodes] = useState<SimNode[]>(INITIAL_NODES);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [lastActivated, setLastActivated] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [liveError, setLiveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(boggersUrl("/status"), {
          headers: { ...getSessionHeaders() },
          cache: "no-store",
        });
        if (!r.ok) {
          if (!cancelled) {
            setLive(null);
            setLiveError(true);
          }
          return;
        }
        const data = await r.json();
        const s = data.status ?? {};
        if (!cancelled) {
          setLive({
            tension: Number(s.tension ?? 0),
            cycle: Number(s.cycle_count ?? 0),
            nodes: Number(data.graph?.nodes ?? 0),
            edges: Number(data.graph?.edges ?? 0),
          });
          setLiveError(false);
        }
      } catch {
        if (!cancelled) {
          setLive(null);
          setLiveError(true);
        }
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const getNode = useCallback(
    (id: string, nodeList = nodes) => nodeList.find((n) => n.id === id),
    [nodes]
  );

  const propagate = useCallback((sourceId: string, nodeList: SimNode[]): SimNode[] => {
    const source = nodeList.find((n) => n.id === sourceId);
    if (!source) return nodeList;

    const edges = EDGES.filter((e) => e.from === sourceId || e.to === sourceId);
    return nodeList.map((n) => {
      const edge = edges.find((e) => e.from === n.id || e.to === n.id);
      if (!edge || n.id === sourceId) return n;
      const transfer = source.activation * edge.weight * 0.45;
      return { ...n, activation: clamp(n.activation + transfer, 0, 1) };
    });
  }, []);

  const relax = useCallback((nodeList: SimNode[]): SimNode[] => {
    return nodeList.map((n) => ({
      ...n,
      activation: clamp(lerp(n.activation, n.baseStrength, 0.08), 0, 1),
    }));
  }, []);

  const tick = useCallback(() => {
    setNodes((prev) => {
      const strongest = prev.reduce((a, b) =>
        a.activation * 0.7 + a.baseStrength * 0.3 > b.activation * 0.7 + b.baseStrength * 0.3 ? a : b
      );
      let next = propagate(strongest.id, prev);
      next = relax(next);
      return next;
    });
    setCycle((c) => c + 1);
  }, [propagate, relax]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const activateNode = useCallback((id: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, activation: clamp(n.activation + 0.4, 0, 1) }
          : n
      )
    );
    setLastActivated(id);
    // Propagate after a short delay
    setTimeout(() => {
      setNodes((prev) => propagate(id, prev));
    }, 300);
  }, [propagate]);

  const reset = useCallback(() => {
    setNodes(INITIAL_NODES);
    setCycle(0);
    setLastActivated(null);
    setRunning(false);
  }, []);

  const svgWidth = 100;
  const svgHeight = 100;

  const getColor = (activation: number) => {
    const alpha = 0.3 + activation * 0.7;
    return `rgba(160,32,240,${alpha})`;
  };

  return (
    <div className="ts-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ts-purple/20 bg-ts-purple/5">
        <div className="flex items-center gap-2 flex-wrap">
          <Zap className="w-3.5 h-3.5 text-ts-purple" />
          <span className="text-xs font-mono text-ts-purple-light">TS-OS Mini Simulator</span>
          {live && (
            <span className="text-[10px] font-mono text-green-400 border border-green-500/40 rounded px-1.5 py-0.5">
              LIVE · cycle {live.cycle} · tension {live.tension.toFixed(2)} · graph {live.nodes}n/{live.edges}e
            </span>
          )}
          {!live && liveError && (
            <span className="text-[10px] font-mono text-muted-foreground/70">offline preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">cycle #{cycle}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRunning((r) => !r)}
            className="h-6 px-2 text-xs"
          >
            {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {running ? "Pause" : "Auto"}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} className="h-6 px-2 text-xs">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:divide-x sm:divide-ts-purple/20">
        {/* Graph SVG */}
        <div className="p-4 bg-black/30">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48"
            style={{ overflow: "visible" }}
          >
            {/* Edges */}
            {EDGES.map((edge) => {
              const from = getNode(edge.from);
              const to = getNode(edge.to);
              if (!from || !to) return null;
              const avgAct = (from.activation + to.activation) / 2;
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={`rgba(160,32,240,${edge.weight * avgAct * 0.6})`}
                  strokeWidth={edge.weight * avgAct * 1.2}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const r = 3 + node.activation * 3;
              const isActive = lastActivated === node.id;
              return (
                <g key={node.id}>
                  {/* Glow ring */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r * 2.5}
                    fill={`rgba(160,32,240,${node.activation * 0.15})`}
                  />
                  {/* Core */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r}
                    fill={getColor(node.activation)}
                    stroke={`rgba(192,96,255,${node.activation * 0.9})`}
                    strokeWidth={0.5}
                    style={{ cursor: "pointer", transition: "r 0.3s, fill 0.3s" }}
                    onClick={() => activateNode(node.id)}
                  />
                  {/* Pulse ring on activation */}
                  {isActive && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r * 3}
                      fill="none"
                      stroke="rgba(160,32,240,0.5)"
                      strokeWidth={0.5}
                      style={{ animation: "propagate 1s ease-out forwards" }}
                    />
                  )}
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + r + 4}
                    textAnchor="middle"
                    fontSize="4"
                    fill={`rgba(192,96,255,${node.activation * 0.9})`}
                    style={{ pointerEvents: "none", fontFamily: "monospace" }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="text-[10px] text-muted-foreground text-center mt-1 font-mono">
            Click nodes to push activation
          </p>
        </div>

        {/* Node state table */}
        <div className="p-4 space-y-1.5">
          <div className="text-[10px] font-mono text-ts-purple uppercase tracking-widest mb-3">
            Node States
          </div>
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => activateNode(node.id)}
              className="w-full flex items-center gap-2 text-xs group hover:bg-ts-purple/5 rounded px-1 py-0.5 transition-colors"
            >
              <span className="text-ts-purple/50 font-mono w-20 text-left truncate group-hover:text-ts-purple-light transition-colors">
                {node.label}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-ts-purple/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-ts-purple transition-all duration-500"
                  style={{ width: `${node.activation * 100}%` }}
                />
              </div>
              <span className={`font-mono text-[10px] w-8 text-right ${
                node.activation > 0.7 ? "text-ts-purple-light" : 
                node.activation < 0.3 ? "text-muted-foreground/50" : "text-muted-foreground"
              }`}>
                {(node.activation * 100).toFixed(0)}%
              </span>
            </button>
          ))}
          <div className="pt-2 border-t border-ts-purple/10 mt-2">
            <Button size="sm" variant="default" onClick={tick} className="w-full h-7 text-xs">
              <Zap className="w-3 h-3" />
              Tick Wave Cycle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
