"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Database,
  RefreshCw,
  Brain,
  Eye,
  Shield,
  Activity,
  Play,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  WAVE_CYCLE_STEPS,
  SELF_IMPROVEMENT_LOOP,
  MULTIMODAL_STACK,
  TECH_STACK,
  TS_PHILOSOPHY,
} from "@/lib/tsData";
import { TSMiniSim } from "@/components/graph/TSMiniSim";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "universal-graph",
    icon: Database,
    title: "UniversalLivingGraph",
    subtitle: "The substrate — every concept is a node",
    content: `The UniversalLivingGraph (ULG) is the core data structure of TS-OS. Every piece of knowledge, every concept, every relationship is a node or edge in this graph.

Each node carries:
• id (UUID) — unique identity
• label (str) — human-readable name  
• activation (float 0.0–1.0) — current excitation level
• stability (float 0.0–1.0) — how resistant to change
• base_strength (float 0.0–1.0) — resting activation target
• edges (list[EdgeID]) — weighted connections to other nodes
• embedding (list[float]) — semantic vector for cosine similarity

The graph is backed by SQLite in WAL (Write-Ahead Logging) mode for zero-downtime incremental saves, with a JSON fallback for crash recovery. Every wave cycle writes only the changed nodes (delta encoding) — the full graph is never re-written from scratch.`,
    code: `# UniversalLivingGraph core schema
@dataclass
class TSNode:
    id: str                    # UUID
    label: str
    activation: float = 0.5   # [0.0, 1.0]
    stability: float = 0.7    # [0.0, 1.0]
    base_strength: float = 0.5
    edges: list[EdgeID] = field(default_factory=list)
    embedding: list[float] = field(default_factory=list)

class UniversalLivingGraph:
    def __init__(self, db_path: str = "ts_graph.db"):
        self.nodes: dict[str, TSNode] = {}
        self.edges: dict[EdgeID, Edge] = {}
        self._db = SQLiteWAL(db_path)  # WAL mode`,
  },
  {
    id: "wave-cycle",
    icon: RefreshCw,
    title: "WaveCycleRunner",
    subtitle: "The 30-second heartbeat of the system",
    content: `The WaveCycleRunner is a daemon thread that executes the full 9-step wave cycle every 30 seconds. It's the heartbeat of TS-OS — without it, the graph is just static data.

The cycle mirrors how real constraint-propagation systems work: activate the strongest node, spread that activation through the graph weighted by edge strength + semantic similarity, then relax everything back toward its base strength. Contradictions are detected and resolved. New patterns emerge.

The 30-second interval is not arbitrary — it's fast enough to respond to changes, slow enough to let activations propagate and stabilize. You can adjust it in config.yaml.`,
    steps: WAVE_CYCLE_STEPS,
  },
  {
    id: "self-improve",
    icon: Brain,
    title: "Self-Improvement Loop",
    subtitle: "High-confidence traces → QLoRA → hot-swap",
    content: `The self-improvement loop closes the system on itself. Every high-confidence interaction trace is collected, formatted as an Alpaca-style instruction dataset, and used to fine-tune the base LLM with Unsloth 4-bit QLoRA.

The critical innovation: validation rollback. Before hot-swapping the new weights, the system runs a held-out validation set. If semantic similarity or task success rate doesn't improve, the previous model is restored instantly — zero downtime, zero regression.

This is the same principle as wave propagation: you only accept a new configuration if it's more stable than the previous one. The system improves exactly like the graph does — by relaxing toward higher stability.`,
    steps: SELF_IMPROVEMENT_LOOP.steps.map((s, i) => ({ step: i + 1, name: s, description: "" })),
    stack: SELF_IMPROVEMENT_LOOP.stack,
  },
  {
    id: "multimodal",
    icon: Eye,
    title: "Multimodal Stack",
    subtitle: "Audio · Vision · Speech — fully local",
    content: `All multimodal processing runs entirely offline — no API calls, no latency, no privacy leaks. The stack is modular: you can run just whisper, just BLIP2, or all three simultaneously.`,
    items: MULTIMODAL_STACK,
  },
  {
    id: "observability",
    icon: Activity,
    title: "Observability Stack",
    subtitle: "FastAPI dashboard + Cytoscape.js + Rich TUI",
    content: `Three layers of visibility into the running system:

1. FastAPI Dashboard — REST endpoints + WebSocket streaming for live node activation data. Cytoscape.js renders the living graph in real-time; Chart.js shows activation/tension history.

2. Rich TUI — terminal-based live view. Every wave cycle tick is logged with color-coded node states, tension meters, and cycle statistics. No browser required.

3. Structured logging — every wave cycle step is logged as structured JSON, queryable with any log analysis tool.

The dashboard runs at localhost:8000 by default and requires no authentication in local mode.`,
    code: `# FastAPI + Cytoscape live endpoint
@app.websocket("/ws/graph")
async def graph_stream(ws: WebSocket):
    await ws.accept()
    while True:
        snapshot = graph.to_cytoscape_json()
        await ws.send_json(snapshot)
        await asyncio.sleep(1.0)  # 1Hz update`,
  },
  {
    id: "security",
    icon: Shield,
    title: "Security Guardrails",
    subtitle: "Constraint-based content safety",
    content: `Security in TS-OS is implemented as graph constraints — not as a separate filter layer bolted on top, but as stability conditions that must hold for any output to propagate.

Guardrails are implemented as high-stability nodes that act as "anchors" — their activation decays very slowly and they resist being overwritten. If an output would require activating a guardrail-conflicting pattern, the contradiction-detection step in the wave cycle catches it and resolves it by deferring to the higher-stability anchor node.

This makes TS-OS security composable: you add new constraints by adding new high-stability anchor nodes. No code changes required.`,
  },
];

interface SectionProps {
  section: typeof SECTIONS[0];
  isOpen: boolean;
  onToggle: () => void;
}

function Section({ section, isOpen, onToggle }: SectionProps) {
  const Icon = section.icon;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className={cn("ts-card overflow-hidden", isOpen ? "border-ts-purple/50" : "")}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-ts-purple/5 transition-colors"
      >
        <div
          className={cn(
            "w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all duration-300",
            isOpen
              ? "border-ts-purple bg-ts-purple/20 shadow-ts"
              : "border-ts-purple/30 bg-ts-purple/5"
          )}
        >
          <Icon className={cn("w-4 h-4", isOpen ? "text-ts-purple-light" : "text-ts-purple/60")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("font-mono font-semibold text-sm", isOpen ? "text-ts-purple-light" : "text-foreground")}>
            {section.title}
          </div>
          <div className="text-xs text-muted-foreground">{section.subtitle}</div>
        </div>
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-ts-purple" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-5 pb-6 space-y-4 border-t border-ts-purple/20">
              {/* Main content */}
              <div className="pt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>

              {/* Steps */}
              {section.steps && (
                <div className="space-y-2">
                  {section.steps.map((step) => (
                    <div key={step.step} className="flex items-start gap-3 text-xs">
                      <div className="w-6 h-6 rounded border border-ts-purple/30 flex items-center justify-center font-mono text-ts-purple/60 flex-shrink-0 mt-0.5">
                        {step.step}
                      </div>
                      <div>
                        <span className="text-ts-purple-light font-medium font-mono">{step.name}</span>
                        {step.description && (
                          <span className="text-muted-foreground ml-2">{step.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Multimodal items */}
              {section.items && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {section.items.map((item) => (
                    <div key={item.name} className="bg-ts-purple/5 border border-ts-purple/20 rounded-lg p-3">
                      <div className="font-mono font-semibold text-xs text-ts-purple-light mb-1">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.role}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Code block */}
              {section.code && (
                <div className="ts-code text-xs leading-relaxed overflow-x-auto">
                  <pre>{section.code}</pre>
                </div>
              )}

              {/* Stack badge */}
              {section.stack && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Stack:</span>
                  <Badge variant="default">{section.stack}</Badge>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TSOSPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["universal-graph"])
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openAll = () => setOpenSections(new Set(SECTIONS.map((s) => s.id)));
  const closeAll = () => setOpenSections(new Set());

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 ts-grid-bg opacity-25" style={{ backgroundSize: "50px 50px" }} />
        <div className="absolute right-1/4 top-1/2 w-80 h-80 rounded-full bg-ts-purple/5 blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-6">
              <Zap className="w-3 h-3" />
              TS-OS Architecture
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
              The Operating System
              <br />
              <span className="ts-gradient-text">for Thinking</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A dead-simple loop that runs your laptop into a living cognitive OS.
              Every component is a node. Every interaction is a wave.
            </p>
          </motion.div>
        </div>
      </section>

      {/* TS-OS loop */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="ts-card p-6 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 -mx-6 -mt-6 mb-4 border-b border-ts-purple/20 bg-ts-purple/5">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs font-mono text-muted-foreground ml-2">ts_os.py</span>
            </div>
            <pre className="font-mono text-sm leading-loose overflow-x-auto">
              {TS_PHILOSOPHY.os.loop.split("\n").map((line, i) => {
                const isComment = line.includes("//");
                const [code, comment] = isComment ? line.split("//") : [line, ""];
                return (
                  <div key={i} className="min-h-[1.6em]">
                    <span className={
                      code.trim().startsWith("while") || code.trim().startsWith("if")
                        ? "text-ts-purple font-bold"
                        : code.trim().startsWith("Propagate") || code.trim().startsWith("Relax") || code.trim().startsWith("Break") || code.trim().startsWith("Evolve")
                        ? "text-ts-purple-light font-medium"
                        : "text-ts-purple-light/70"
                    }>{code}</span>
                    {comment && <span className="text-muted-foreground/50 text-xs italic">//{comment}</span>}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </section>

      {/* Mini-simulator */}
      <section id="simulator" className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-ts-purple uppercase tracking-widest mb-2">
              <Play className="w-3 h-3" />
              Live Mini-Simulator
            </div>
            <p className="text-sm text-muted-foreground">
              Click any node to push activation. Watch the wave propagate and relax.
            </p>
          </div>
          <TSMiniSim />
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-4xl my-4" />

      {/* Architecture deep-dive */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Component Architecture</h2>
              <p className="text-sm text-muted-foreground">Click any section to expand</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={openAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={closeAll}>
                Collapse
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {SECTIONS.map((section) => (
              <Section
                key={section.id}
                section={section}
                isOpen={openSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Config schema */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">config.yaml Schema</h2>
            <p className="text-sm text-muted-foreground">Full configuration reference</p>
          </div>
          <div className="ts-code text-xs leading-relaxed overflow-x-auto">
            <pre>{`# BoggersTheAI / TS-OS config.yaml
# Full configuration schema

graph:
  db_path: "ts_graph.db"          # SQLite WAL database path
  json_fallback: "ts_graph.json"  # JSON backup on crash
  max_nodes: 10000                # Prune oldest if exceeded
  embedding_dim: 384              # Sentence embedding dimension

wave:
  cycle_interval_sec: 30         # WaveCycleRunner tick rate
  propagation_depth: 3           # Max hops per cycle
  decay_rate: 0.05               # Relaxation rate per tick
  edge_prune_threshold: 0.25     # Remove edges below this weight
  merge_overlap_threshold: 0.50  # Merge nodes with >50% overlap
  tension_break_threshold: 0.85  # Break point (0.0–1.0)

llm:
  model: "llama3.2:3b"           # Ollama model name
  temperature: 0.7
  max_tokens: 512
  evolve_threshold: 0.9          # Min confidence to spawn new node

self_improve:
  enabled: true
  trace_collection: true
  min_traces_for_training: 100
  validation_improvement_required: 0.02  # Must improve by 2%
  qlora_rank: 16
  qlora_alpha: 32
  training_epochs: 3

multimodal:
  whisper:
    enabled: true
    model: "base"               # tiny, base, small, medium, large
    device: "cpu"               # cpu or cuda
  blip2:
    enabled: false              # Requires GPU
  tts:
    enabled: true
    voice: "en_US-lessac-medium"

api:
  host: "0.0.0.0"
  port: 8000
  debug: false
  cors_origins: ["http://localhost:3000"]

security:
  guardrail_nodes:             # High-stability anchor nodes
    - "safety-anchor"
    - "honesty-anchor"
  min_anchor_stability: 0.95`}</pre>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Full Stack</h2>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((t) => (
              <Badge key={t.name} variant="outline" className="text-xs">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Run It Yourself</h2>
          <p className="text-muted-foreground mb-6">
            One-command install. The system runs on your laptop, offline, with no external dependencies.
          </p>
          <Button size="lg" asChild>
            <Link href="/lab">
              <Play className="w-4 h-4" />
              Go to the Lab
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
