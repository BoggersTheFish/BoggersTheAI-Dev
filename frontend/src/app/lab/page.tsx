"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Terminal,
  Copy,
  Check,
  Zap,
  Play,
  ArrowRight,
  Activity,
  Send,
  Github,
  Cpu,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { TSMiniSim } from "@/components/graph/TSMiniSim";
import { boggersUrl, getSessionHeaders } from "@/lib/boggersApi";
import { cn } from "@/lib/utils";

const INSTALL_STEPS = [
  {
    step: 1,
    title: "Clone BoggersTheAI",
    code: "git clone https://github.com/BoggersTheFish/BoggersTheAI\ncd BoggersTheAI",
  },
  {
    step: 2,
    title: "Install dependencies",
    code: "pip install -e \".[llm,adapters]\"\n# Optional extras: faster-whisper, piper-tts (multimodal)",
  },
  {
    step: 3,
    title: "Configure",
    code: "# config.yaml ships in the repo — edit inference.ollama.model / paths as needed",
  },
  {
    step: 4,
    title: "Install Ollama + a model",
    code: "# https://ollama.com\nollama pull llama3.2\nollama pull nomic-embed-text",
  },
  {
    step: 5,
    title: "Run the system",
    code: "dashboard-start\n# FastAPI dashboard → http://localhost:8000\n# Or: boggers (CLI + background wave)",
  },
];

const DASHBOARD_FEATURES = [
  { icon: Activity, title: "Live Graph View", desc: "Cytoscape.js renders the living graph in real-time — watch activation flow between nodes as the wave cycle runs." },
  { icon: Zap, title: "Wave Cycle Monitor", desc: "Chart.js plots activation history, tension levels, and cycle stats. See every Propagate → Relax → Evolve step." },
  { icon: Terminal, title: "Rich TUI", desc: "Terminal-first interface with color-coded node states, tension meters, and live cycle logs. No browser required." },
  { icon: Play, title: "Interactive Nodes", desc: "Click any node in the dashboard to manually push activation — same as vibe-coding a node. Watch the wave propagate." },
];

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={copy}
      className="absolute top-2.5 right-2.5 p-1.5 rounded border border-ts-purple/20 text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/40 transition-all"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/**
 * Wave 15: PushNodeForm with WASM fallback.
 *
 * Primary path: POST /query → BoggersRuntime.ask() (full Python/LLM pipeline).
 * Fallback path: when the backend is offline, WasmQueryEngine answers locally
 * in the browser using the pre-seeded TS-OS concept graph + wave cycles.
 *
 * TS Logic: The WASM fallback runs real propagate/relax/tension cycles on a
 * 12-node knowledge graph. The answer comes from whichever node emerges with
 * the highest activation after 4 wave cycles. Same math, no server needed.
 */
function PushNodeForm() {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wasmMode, setWasmMode] = useState(false);
  const [lastAnswer, setLastAnswer] = useState("");
  const [lastSource, setLastSource] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);

    // If already in WASM mode, skip the backend attempt
    if (wasmMode) {
      await handleWasmQuery(value.trim());
      setLoading(false);
      return;
    }

    try {
      const r = await fetch(boggersUrl("/query"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSessionHeaders(),
        },
        body: JSON.stringify({ query: value.trim() }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error((data as { detail?: string }).detail || r.statusText);
      }
      if ((data as { ok?: boolean }).ok) {
        const answer = String((data as { answer?: string }).answer ?? "");
        setLastAnswer(answer);
        setLastSource("live");
        setSubmitted(true);
        toast({
          title: `↯ TS-OS response`,
          description: answer.slice(0, 280),
          variant: "wave",
        });
      } else {
        throw new Error((data as { error?: string }).error || "Query failed");
      }
    } catch {
      // Backend offline — switch to WASM mode automatically
      setWasmMode(true);
      await handleWasmQuery(value.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleWasmQuery = async (text: string) => {
    // Lazy-import so the engine only loads when actually needed
    const { getWasmQueryEngine } = await import("@/lib/wasmQueryEngine");
    const engine = getWasmQueryEngine();
    const result = engine.query(text);
    setLastAnswer(result.answer);
    setLastSource(`wasm:${result.sourceNode}`);
    setSubmitted(true);
    toast({
      title: "↯ WASM response (offline mode)",
      description: result.answer.slice(0, 280),
      variant: "wave",
    });
  };

  return (
    <div className="ts-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-ts-purple" />
        <h3 className="font-mono font-semibold text-sm text-ts-purple-light">Push a Node</h3>
        <Badge variant="outline" className="text-[10px]">Vibe-code</Badge>
        {wasmMode && (
          <Badge
            variant="outline"
            className="text-[10px] border-orange-400/40 text-orange-400 flex items-center gap-1"
          >
            <Cpu className="w-2.5 h-2.5" />
            WASM mode
          </Badge>
        )}
      </div>

      {/* Wave 15 offline banner */}
      {wasmMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-3 px-3 py-2 rounded-lg border border-orange-400/30 bg-orange-400/5 text-[11px] text-orange-300 flex items-start gap-2"
        >
          <WifiOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Backend offline</strong> — running in{" "}
            <Link href="/wasm" className="underline">Wave 15 WASM mode</Link>.
            {" "}Answers come from a 12-node browser graph (same wave math, no LLM).
            {" "}Start Docker to restore full responses.
          </span>
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground mb-4">
        Type any concept, idea, or question. This simulates sending activation to the
        TS graph — finding the lowest-stability node and pushing it. The OS converges
        everything else.
      </p>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              wasmMode
                ? "e.g. 'How does tension drive emergence?'\n'What is the wave engine?'\n'Explain distributed sharding'"
                : "e.g. 'What if nodes could merge across sessions?'\n'Build a distributed version of UniversalLivingGraph'\n'Why does tension spike at node merges?'"
            }
            className={cn(
              "w-full h-28 px-3 py-2 rounded-lg text-sm font-mono",
              "bg-black border border-ts-purple/20 text-foreground",
              "placeholder:text-muted-foreground/40",
              "focus:outline-none focus:border-ts-purple/50 focus:ring-1 focus:ring-ts-purple/30",
              "resize-none transition-colors"
            )}
          />
          <Button type="submit" disabled={!value.trim() || loading} className="w-full">
            {loading ? (
              <>
                <Activity className="w-4 h-4 animate-pulse" />
                {wasmMode ? "Running wave cycles…" : "Propagating…"}
              </>
            ) : (
              <>
                {wasmMode ? <Cpu className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {wasmMode ? "Run WASM Query" : "Push Activation"}
              </>
            )}
          </Button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <div className={cn(
            "inline-flex items-center justify-center w-12 h-12 rounded-full border-2 mb-3",
            wasmMode
              ? "border-orange-400 bg-orange-400/20"
              : "border-ts-purple bg-ts-purple/20 shadow-ts"
          )}>
            {wasmMode ? (
              <Cpu className="w-5 h-5 text-orange-400" />
            ) : (
              <Zap className="w-5 h-5 text-ts-purple-light" />
            )}
          </div>
          <p className={cn(
            "font-mono text-sm font-semibold",
            wasmMode ? "text-orange-300" : "text-ts-purple-light"
          )}>
            {wasmMode ? "WASM wave propagated ↯" : "Wave propagated ↯"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {wasmMode
              ? `Answered by node "${lastSource.replace("wasm:", "")}" — browser graph, no server.`
              : "Answer came from the live graph + synthesis path."}
          </p>
          {lastAnswer && (
            <p className="text-xs text-muted-foreground/70 mt-2 text-left px-2 max-h-24 overflow-y-auto leading-relaxed">
              {lastAnswer.slice(0, 320)}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-xs"
            onClick={() => { setSubmitted(false); setValue(""); setLastAnswer(""); }}
          >
            Push another
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export default function LabPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 ts-grid-bg opacity-25" style={{ backgroundSize: "50px 50px" }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-ts-purple/5 blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-6">
            <Activity className="w-3 h-3 animate-pulse" />
            Lab — Live Nodes
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            Run <span className="ts-gradient-text">BoggersTheAI</span>
            <br />on Your Machine
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Local-first. No cloud. No API keys for the core. One Python install and
            your laptop becomes a running TS instance.
          </p>
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-4xl" />

      {/* Install guide */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Install in 5 Steps</h2>
            <p className="text-muted-foreground text-sm">~5 minutes from zero to running wave cycle.</p>
          </div>

          <div className="space-y-3">
            {INSTALL_STEPS.map((step) => (
              <div key={step.step} className="ts-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-ts-purple/20 bg-ts-purple/5">
                  <div className="w-6 h-6 rounded-full border border-ts-purple/50 bg-ts-purple/20 flex items-center justify-center text-xs font-mono font-bold text-ts-purple-light flex-shrink-0">
                    {step.step}
                  </div>
                  <span className="text-sm font-medium text-foreground">{step.title}</span>
                </div>
                <div className="relative">
                  <pre className="p-4 font-mono text-xs text-ts-purple-light overflow-x-auto leading-relaxed">
                    {step.code.split("\n").map((line, i) => (
                      <div key={i}>
                        {line.startsWith("#") ? (
                          <span className="text-muted-foreground/50">{line}</span>
                        ) : line.startsWith("python") || line.startsWith("pip") || line.startsWith("ollama") || line.startsWith("git") || line.startsWith("cp") || line.startsWith("cd") ? (
                          <><span className="text-ts-purple/60">$ </span><span>{line}</span></>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    ))}
                  </pre>
                  <CopyButton code={step.code.replace(/^#.*\n?/gm, "").replace(/^\$ /gm, "").trim()} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link
                href="https://github.com/BoggersTheFish/BoggersTheAI"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4" />
                BoggersTheAI on GitHub
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ts-os">
                Read the Architecture
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-4xl" />

      {/* Dashboard features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Dashboard Features</h2>
            <p className="text-muted-foreground text-sm">FastAPI + Cytoscape.js + Chart.js + Rich TUI — full observability stack.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DASHBOARD_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="ts-card p-5 flex gap-4">
                  <div className="w-9 h-9 rounded-lg border border-ts-purple/30 bg-ts-purple/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-ts-purple-light" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white mb-1">{f.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-4xl" />

      {/* Mini-sim + push-node */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Try It Here</h2>
            <p className="text-muted-foreground text-sm">
              A browser-based preview of the wave cycle. Click nodes, push activation, watch propagation.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TSMiniSim />
            <PushNodeForm />
          </div>
        </div>
      </section>
    </div>
  );
}
