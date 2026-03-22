"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Github,
  Zap,
  Play,
  ChevronDown,
  MessageSquare,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TSForceGraph } from "@/components/graph/TSForceGraph";
import { TS_PHILOSOPHY, SITE_META, TS_SITE_PIPELINE } from "@/lib/tsData";
import { useWaveStore } from "@/store/waveStore";

const FADE_UP = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function HeroSection() {
  const tension = useWaveStore((s) => s.tension);
  const cycle = useWaveStore((s) => s.cycle);
  const activeNodeId = useWaveStore((s) => s.activeNodeId);
  const nodes = useWaveStore((s) => s.nodes);
  const activeNode = activeNodeId ? nodes[activeNodeId] : null;

  const tensionColor =
    tension > 0.7 ? "text-red-400" : tension > 0.4 ? "text-yellow-400" : "text-green-400";

  return (
    <section
      id="home"
      className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden"
    >
      <div
        className="absolute inset-0 ts-grid-bg animate-grid-pulse pointer-events-none"
        style={{ backgroundSize: "50px 50px" }}
      />
      <div className="absolute inset-0 bg-gradient-radial from-ts-purple/10 via-ts-purple/[0.02] to-transparent pointer-events-none" />

      <TSForceGraph
        className="absolute inset-0 w-full h-full"
        interactive
        showLabels
        particleSpeed={0.004}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 38%, rgba(0,0,0,0.72) 100%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Copy — language surface */}
          <div className="lg:col-span-7 text-center lg:text-left pointer-events-none">
            <motion.div
              custom={0}
              initial="hidden"
              animate="show"
              variants={FADE_UP}
              className="flex justify-center lg:justify-start pointer-events-auto mb-8"
            >
              <div className="ts-phase-pill">
                <Layers className="w-3 h-3 text-ts-purple" />
                Wave {SITE_META.currentWave} — {SITE_META.waveName}
                <span className="text-ts-purple/35">|</span>
                <span className="text-muted-foreground normal-case tracking-normal">
                  substrate → surface
                </span>
              </div>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="show"
              variants={FADE_UP}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 leading-[1.05]"
            >
              <span className="ts-gradient-text-animated block drop-shadow-[0_0_28px_rgba(160,32,240,0.45)]">
                Thinking System
              </span>
              <span className="text-white/85 text-xl sm:text-2xl md:text-3xl font-light tracking-[0.35em] block mt-4 uppercase">
                / Thinking Wave
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="show"
              variants={FADE_UP}
              className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
            >
              {TS_PHILOSOPHY.subheadline}
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="show"
              variants={FADE_UP}
              className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 pointer-events-auto"
            >
              <Button size="lg" className="w-full sm:w-auto gap-2" asChild>
                <a href="#pipeline">
                  <Zap className="w-4 h-4" />
                  See the pipeline
                </a>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" asChild>
                <Link href="/chat">
                  <MessageSquare className="w-4 h-4" />
                  TS Chat
                </Link>
              </Button>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2" asChild>
                <Link href="/lab">
                  <Play className="w-4 h-4" />
                  Lab
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto gap-2" asChild>
                <Link
                  href="https://github.com/BoggersTheFish"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Status stack — fixed substrate snapshot */}
          <motion.div
            custom={4}
            initial="hidden"
            animate="show"
            variants={FADE_UP}
            className="lg:col-span-5 pointer-events-auto"
          >
            <div className="ts-surface-panel p-6 sm:p-7 space-y-6 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-ts-purple/80">
                  Live substrate
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  #{cycle}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-ts-purple/20 bg-black/40 px-3 py-2.5">
                  <div className="text-[10px] font-mono text-ts-purple/50 mb-1">tension</div>
                  <div className={`text-sm font-mono font-semibold ${tensionColor}`}>
                    {(tension * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl border border-ts-purple/20 bg-black/40 px-3 py-2.5">
                  <div className="text-[10px] font-mono text-ts-purple/50 mb-1">active node</div>
                  <div className="text-sm font-mono text-ts-purple-light truncate">
                    {activeNode?.label ?? "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-ts-purple/20 bg-black/40 px-3 py-2.5 col-span-2">
                  <div className="text-[10px] font-mono text-ts-purple/50 mb-1">graph nodes</div>
                  <div className="text-sm font-mono text-white">
                    {Object.keys(nodes).length} in simulation
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ts-purple/70 mb-3">
                  Query path (same order as TS-OS)
                </div>
                <ul className="space-y-2">
                  {TS_SITE_PIPELINE.map((s) => (
                    <li
                      key={s.phase}
                      className="flex gap-3 text-xs text-muted-foreground leading-snug"
                    >
                      <span className="font-mono text-ts-purple/50 shrink-0 w-6">{s.phase}</span>
                      <span>
                        <span className="text-ts-purple-light/95 font-medium">{s.name}</span>
                        <span className="text-muted-foreground"> — {s.role}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button variant="outline" size="sm" className="w-full font-mono text-xs" asChild>
                <Link href="/ts-os">
                  Architecture reference
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50 text-xs font-mono animate-bounce-gentle pointer-events-none"
      >
        <span>scroll</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}
