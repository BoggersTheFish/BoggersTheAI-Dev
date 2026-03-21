import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Circle, Zap, Clock, ArrowRight, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WAVE_LOG, REPOS } from "@/lib/tsData";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Waves — BoggersTheFish",
  description:
    "The complete evolution log of the Thinking System — Wave 1 through Wave 12 LIVE, plus roadmap nodes.",
};

const STATUS_CONFIG = {
  complete: { Icon: CheckCircle, color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/5", badge: "complete" as const },
  current: { Icon: Zap, color: "text-ts-purple-light", border: "border-ts-purple/50", bg: "bg-ts-purple/8", badge: "current" as const },
  next: { Icon: Circle, color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/5", badge: "low-stability" as const },
  roadmap: { Icon: Clock, color: "text-muted-foreground", border: "border-white/10", bg: "bg-white/2", badge: "roadmap" as const },
};

const ROADMAP_NODES = [
  {
    id: "docker",
    title: "Docker One-Click",
    wave: 14,
    stability: 0.3,
    description: "Single `docker-compose up` to spin up the full TS-OS stack — graph engine, LLM, dashboard, TUI. Zero local Python setup.",
    status: "roadmap" as const,
  },
  {
    id: "sharding",
    title: "Distributed Sharding (>10k nodes)",
    wave: 13,
    stability: 0.35,
    description: "Horizontal graph sharding for graphs exceeding 10k nodes. Consistent hashing + cross-shard activation propagation.",
    status: "next" as const,
  },
  {
    id: "wasm",
    title: "WebAssembly Port",
    wave: 15,
    stability: 0.2,
    description: "TS-OS core compiled to WASM. Run the wave cycle in the browser, no install required. This site becomes the runtime.",
    status: "roadmap" as const,
  },
  {
    id: "multi-agent",
    title: "Multi-Agent Coordination",
    wave: 16,
    stability: 0.15,
    description: "Multiple TS instances share a global graph layer. Agents negotiate activation via competitive edge weighting.",
    status: "roadmap" as const,
  },
];

export default function WavesPage() {
  const completedWaves = WAVE_LOG.filter((w) => w.status === "complete").length;
  const currentWave = WAVE_LOG.find((w) => w.status === "current");

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 ts-grid-bg opacity-25" style={{ backgroundSize: "50px 50px" }} />
        <div className="absolute left-1/4 top-1/2 w-80 h-80 rounded-full bg-ts-purple/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-6">
            <Zap className="w-3 h-3" />
            Wave Progress Log
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            Evolution of
            <br />
            <span className="ts-gradient-text">the System</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            Each wave is a completed node. {completedWaves} waves shipped.
            Currently live on Wave {currentWave?.wave} — {currentWave?.name}.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Waves Shipped", value: String(completedWaves) },
              { label: "Tests Passing", value: "200+" },
              { label: "Active Repos", value: String(REPOS.length) },
              { label: "Current Wave", value: `#${currentWave?.wave}` },
            ].map((stat) => (
              <div key={stat.label} className="ts-card p-4 text-center">
                <div className="text-2xl font-bold ts-gradient-text mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-4xl" />

      {/* Full wave log */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Complete Wave History</h2>

          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-ts-purple/60 via-ts-purple/30 to-transparent" />

            <div className="space-y-4">
              {WAVE_LOG.map((wave) => {
                const cfg = STATUS_CONFIG[wave.status];
                const { Icon } = cfg;
                const isCurrent = wave.status === "current";
                const isFuture = wave.status === "roadmap" || wave.status === "next";

                return (
                  <div
                    key={wave.wave}
                    className={cn("relative pl-12", isFuture ? "opacity-60" : "")}
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-1.5 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        isCurrent
                          ? "border-ts-purple bg-ts-purple/30 shadow-ts animate-pulse-glow"
                          : wave.status === "complete"
                          ? "border-green-500/60 bg-green-500/10"
                          : "border-ts-purple/30 bg-black"
                      )}
                    >
                      <Icon className={cn("w-2.5 h-2.5", cfg.color)} />
                    </div>

                    <div
                      className={cn(
                        "ts-card p-5",
                        cfg.border,
                        cfg.bg,
                        isCurrent ? "shadow-ts" : ""
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-ts-purple/50">
                          #{wave.wave.toString().padStart(2, "0")}
                        </span>
                        <Badge variant={cfg.badge} className="text-[10px]">
                          {wave.status === "complete"
                            ? "Complete"
                            : wave.status === "current"
                            ? "Live"
                            : wave.status === "next"
                            ? "Next"
                            : "Roadmap"}
                        </Badge>
                        <span className={cn("font-bold text-sm", isCurrent ? "text-ts-purple-light" : "text-white")}>
                          {wave.name}
                        </span>
                        <span className="text-xs text-muted-foreground/60 font-mono ml-auto">
                          {wave.date}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {wave.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-4xl" />

      {/* Lowest-stability nodes (roadmap) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/5 text-xs font-mono text-yellow-400 mb-4">
              <Circle className="w-3 h-3 animate-pulse" />
              Lowest-Stability Nodes
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Roadmap — Vibe-Code These</h2>
            <p className="text-muted-foreground text-sm">
              These are the nodes with the lowest stability — the next targets for activation. 
              The OS tells you what to build next.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROADMAP_NODES.map((node) => (
              <div
                key={node.id}
                className={cn(
                  "ts-card p-5",
                  node.status === "next"
                    ? "border-yellow-500/30"
                    : "border-white/10"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={node.status === "next" ? "low-stability" : "roadmap"}
                      className="text-[10px]"
                    >
                      Wave {node.wave}
                    </Badge>
                    {node.status === "next" && (
                      <Badge variant="low-stability" className="text-[10px]">Next Up</Badge>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    stability {(node.stability * 100).toFixed(0)}%
                  </span>
                </div>
                <h3 className="font-mono font-bold text-sm text-white mb-2">{node.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{node.description}</p>
                {/* Low stability bar */}
                <div className="h-1 rounded-full bg-yellow-500/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-yellow-500/50"
                    style={{ width: `${node.stability * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Repo index */}
      <div className="ts-divider mx-auto max-w-4xl" />
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Every Wave Has a Repo</h2>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {REPOS.map((r) => (
              <Link
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-ts-purple/20 text-xs text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/40 hover:bg-ts-purple/10 transition-all font-mono"
              >
                {r.name}
              </Link>
            ))}
          </div>
          <Button asChild variant="outline">
            <Link href="/projects">
              <Github className="w-4 h-4" />
              View full project graph
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
