"use client";

/**
 * Wave 15 — WasmWaveDemo
 *
 * Full wave-cycle demo running 100% in the browser. No Docker, no install.
 * Uses WaveGraphEngine (TypeScript mirror of the Rust WASM crate) with the
 * same node/edge model as the Python UniversalLivingGraph.
 *
 * Features:
 *   • 10-node TS-OS concept graph with real topology
 *   • Full wave cycle: propagate → relax → tension detection
 *   • Tension visualization (nodes glow red when |act - base| > 0.25)
 *   • Emergence: clicking "Run Cycle" can spawn emergent child nodes
 *   • Click any node to push activation (+0.4)
 *   • WASM / TypeScript runtime badge
 *   • Cycle log with tension events
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, RefreshCw, Play, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WaveGraphEngine, isWasmLoaded, tryLoadWasm } from "@/lib/wasmTsOs";
import type { WasmNodeState } from "@/lib/wasmTsOs";

// ─── Seed graph for the demo ──────────────────────────────────────────────────

const DEMO_NODES: Array<{
  id: string;
  label: string;
  activation: number;
  base_strength: number;
  stability: number;
  content: string;
}> = [
  { id: "core",    label: "TS Core",       activation: 0.85, base_strength: 0.6, stability: 0.9,  content: "Universal Living Graph + Wave Engine" },
  { id: "wave",    label: "Wave",          activation: 0.7,  base_strength: 0.55,stability: 0.85, content: "Propagate → Relax → Tension → Emerge" },
  { id: "memory",  label: "Memory",        activation: 0.5,  base_strength: 0.5, stability: 0.8,  content: "SQLite-backed graph nodes + embeddings" },
  { id: "llm",     label: "LLM",           activation: 0.55, base_strength: 0.45,stability: 0.75, content: "Ollama local inference + synthesis" },
  { id: "tension", label: "Tension",       activation: 0.3,  base_strength: 0.25,stability: 0.65, content: "|activation − base_strength| drives emergence" },
  { id: "emerge",  label: "Emergence",     activation: 0.25, base_strength: 0.2, stability: 0.55, content: "New nodes spawn when tension crosses threshold" },
  { id: "query",   label: "Query",         activation: 0.6,  base_strength: 0.5, stability: 0.8,  content: "QueryProcessor: topics → context → synthesize" },
  { id: "output",  label: "Output",        activation: 0.4,  base_strength: 0.4, stability: 0.85, content: "Synthesized answer after graph traversal" },
  { id: "self",    label: "Self-Improve",  activation: 0.2,  base_strength: 0.2, stability: 0.7,  content: "Trace logging → dataset → fine-tune" },
  { id: "you",     label: "You",           activation: 0.15, base_strength: 0.15,stability: 1.0,  content: "Your queries activate the graph" },
];

const DEMO_EDGES: Array<{ src: string; dst: string; weight: number }> = [
  { src: "core",   dst: "wave",    weight: 0.9 },
  { src: "core",   dst: "memory",  weight: 0.85 },
  { src: "wave",   dst: "tension", weight: 0.9 },
  { src: "wave",   dst: "emerge",  weight: 0.8 },
  { src: "wave",   dst: "memory",  weight: 0.7 },
  { src: "tension",dst: "emerge",  weight: 0.85 },
  { src: "memory", dst: "llm",     weight: 0.75 },
  { src: "llm",    dst: "output",  weight: 0.8 },
  { src: "query",  dst: "core",    weight: 0.9 },
  { src: "query",  dst: "llm",     weight: 0.75 },
  { src: "output", dst: "self",    weight: 0.6 },
  { src: "you",    dst: "query",   weight: 0.95 },
  { src: "self",   dst: "core",    weight: 0.55 },
];

function buildEngine(): WaveGraphEngine {
  const engine = new WaveGraphEngine();
  for (const n of DEMO_NODES) {
    engine.addNode(n.id, n.content, n.activation, n.base_strength, n.stability);
  }
  for (const e of DEMO_EDGES) {
    engine.addEdge(e.src, e.dst, e.weight);
  }
  return engine;
}

// ─── Tension colour helper ────────────────────────────────────────────────────

function tensionColor(tension: number): string {
  if (tension > 0.45) return "bg-red-500";
  if (tension > 0.3)  return "bg-orange-400";
  if (tension > 0.2)  return "bg-yellow-400";
  return "bg-ts-purple";
}

function activationBg(activation: number, tension: number): string {
  if (tension > 0.35) return "border-red-500/60 bg-red-500/10";
  if (tension > 0.2)  return "border-orange-400/50 bg-orange-400/8";
  return "border-ts-purple/30 bg-ts-purple/5";
}

interface LogEntry {
  cycle: number;
  event: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WasmWaveDemo() {
  const engineRef = useRef<WaveGraphEngine>(buildEngine());
  const [nodes, setNodes] = useState<WasmNodeState[]>(() => engineRef.current.getNodes());
  const [cycle, setCycle] = useState(0);
  const [tensions, setTensions] = useState<Record<string, number>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [wasmReady, setWasmReady] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Try to load WASM on mount (non-blocking)
  useEffect(() => {
    tryLoadWasm().then(() => setWasmReady(isWasmLoaded()));
  }, []);

  const refreshState = useCallback(() => {
    const eng = engineRef.current;
    setNodes([...eng.getNodes()]);
    setCycle(eng.cycleCount);
    const t = eng.detectTension(0.2);
    setTensions(t);
  }, []);

  const runCycle = useCallback(() => {
    const eng = engineRef.current;
    const t = eng.runWaveCycle(0.12, 0.92, 0.82, 0.2);
    const c = eng.cycleCount;

    const newEntries: LogEntry[] = [];

    // Log tension events
    for (const [nodeId, score] of Object.entries(t)) {
      if (score > 0.3) {
        newEntries.push({ cycle: c, event: `⚡ ${nodeId} tension=${score.toFixed(2)}` });
      }
    }

    // Attempt emergence if any node is highly tense
    const maxTension = Math.max(0, ...Object.values(t));
    if (maxTension > 0.38) {
      const emergentId = eng.spawnEmergent(0.35);
      if (emergentId) {
        newEntries.push({ cycle: c, event: `✨ Emerged: ${emergentId}` });
      }
    }

    if (newEntries.length === 0) {
      newEntries.push({ cycle: c, event: `↻ Cycle ${c} — tension ${maxTension.toFixed(2)}` });
    }

    setLog((prev) => [...newEntries, ...prev].slice(0, 8));
    refreshState();
  }, [refreshState]);

  const pushNode = useCallback((nodeId: string) => {
    engineRef.current.pushActivation(nodeId, 0.4);
    setLog((prev) => [
      { cycle: engineRef.current.cycleCount, event: `▲ Pushed ${nodeId} +0.4` },
      ...prev,
    ].slice(0, 8));
    refreshState();
    setSelectedNode(nodeId);
    setTimeout(() => setSelectedNode(null), 800);
  }, [refreshState]);

  const reset = useCallback(() => {
    engineRef.current = buildEngine();
    setLog([]);
    setSelectedNode(null);
    refreshState();
  }, [refreshState]);

  const strongest = engineRef.current.strongestNodeId();

  return (
    <div className="ts-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ts-purple/20 bg-ts-purple/5">
        <div className="flex items-center gap-2 flex-wrap">
          <Zap className="w-3.5 h-3.5 text-ts-purple" />
          <span className="text-xs font-mono text-ts-purple-light">Wave 15 — TS-OS (browser)</span>
          <span className="text-[10px] font-mono text-muted-foreground">cycle #{cycle}</span>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0.5 flex items-center gap-1"
          >
            <Cpu className="w-2.5 h-2.5" />
            {wasmReady ? "WebAssembly" : "TypeScript"}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="h-6 px-2 text-xs">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground px-4 pt-2 pb-1">
        Click a node to push activation (+0.4). Click{" "}
        <strong className="text-white">Run Cycle</strong> to propagate → relax → detect tension.
        Emergence fires when tension &gt; 0.38.
      </p>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Node grid */}
        <div className="space-y-1.5">
          {nodes.map((node) => {
            const tension = tensions[node.id] ?? 0;
            const isStrongest = node.id === strongest;
            const isSelected = node.id === selectedNode;
            const isEmergent = node.id.startsWith("emergent:");
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => pushNode(node.id)}
                className={`w-full flex items-center gap-2 text-xs rounded px-2 py-1.5 transition-all border
                  ${activationBg(node.activation, tension)}
                  ${isSelected ? "scale-[1.02] shadow-sm shadow-ts-purple/30" : ""}
                  ${isEmergent ? "border-yellow-400/40 bg-yellow-400/5" : ""}
                  hover:bg-ts-purple/10`}
              >
                <span
                  className={`font-mono w-20 text-left truncate text-[10px]
                    ${isEmergent ? "text-yellow-400" : isStrongest ? "text-ts-purple-light font-semibold" : "text-ts-purple/70"}`}
                >
                  {isEmergent ? "✨ " : isStrongest ? "★ " : ""}
                  {node.id.replace("emergent:", "")}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-ts-purple/10 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${tensionColor(tension)}`}
                    style={{ width: `${node.activation * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] w-9 text-right text-muted-foreground">
                  {(node.activation * 100).toFixed(0)}%
                </span>
                {tension > 0.2 && (
                  <span className="font-mono text-[9px] text-orange-400 w-10 text-right">
                    ⚡{(tension * 100).toFixed(0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Controls + log */}
        <div className="flex flex-col gap-3">
          <Button onClick={runCycle} className="w-full h-9 text-xs font-mono gap-1.5">
            <Play className="w-3 h-3" />
            Run Wave Cycle
          </Button>

          <div className="text-[10px] text-muted-foreground font-mono space-y-0.5">
            <div className="text-ts-purple-light/70">Nodes: {nodes.length} · Edges: {engineRef.current.edgeCount}</div>
            <div>Strongest: <span className="text-white">{strongest ?? "—"}</span></div>
            <div className="text-[9px] opacity-60">
              Same math as Python wave engine — no server needed.
              {" "}Run <code>bash scripts/build-wasm.sh</code> for native WASM.
            </div>
          </div>

          {/* Cycle log */}
          {log.length > 0 && (
            <div className="border border-ts-purple/15 rounded p-2 bg-black/40 space-y-0.5">
              <div className="text-[9px] text-muted-foreground font-mono mb-1">Event log</div>
              {log.map((entry, i) => (
                <div
                  key={i}
                  className={`text-[10px] font-mono truncate ${
                    entry.event.startsWith("✨")
                      ? "text-yellow-400"
                      : entry.event.startsWith("⚡")
                      ? "text-orange-400"
                      : entry.event.startsWith("▲")
                      ? "text-ts-purple-light"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="text-muted-foreground/50 mr-1">#{entry.cycle}</span>
                  {entry.event}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
