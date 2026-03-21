"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Zap, Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TSForceGraph } from "@/components/graph/TSForceGraph";
import { TS_PHILOSOPHY } from "@/lib/tsData";
import { useWaveStore } from "@/store/waveStore";

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
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
    <section id="home" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 ts-grid-bg animate-grid-pulse pointer-events-none"
        style={{ backgroundSize: "50px 50px" }}
      />

      {/* Deep radial glow from center */}
      <div className="absolute inset-0 bg-gradient-radial from-ts-purple/8 via-ts-purple/2 to-transparent pointer-events-none" />

      {/* Interactive force graph — full screen background */}
      <TSForceGraph
        className="absolute inset-0 w-full h-full"
        interactive
        showLabels
        particleSpeed={0.004}
      />

      {/* Vignette edges to fade graph into black */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      {/* Hero content — layered above graph */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 py-32 pointer-events-none">
        {/* Wave badge */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="show"
          variants={FADE_UP}
          className="flex items-center justify-center gap-2 mb-8 pointer-events-auto"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-ts-purple/50 bg-black/70 backdrop-blur-sm text-xs font-mono text-ts-purple-light">
            <span className="w-1.5 h-1.5 rounded-full bg-ts-purple animate-ping-slow" />
            Wave 12 — Pages Island LIVE
            <span className="text-ts-purple/40">|</span>
            <span className="text-muted-foreground">Click any node to activate</span>
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={FADE_UP}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 leading-none"
        >
          <span className="ts-gradient-text-animated block drop-shadow-[0_0_30px_rgba(160,32,240,0.5)]">
            Thinking System
          </span>
          <span className="text-white/80 text-2xl sm:text-3xl md:text-4xl font-light tracking-widest block mt-3 uppercase">
            / Thinking Wave
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="show"
          variants={FADE_UP}
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
        >
          {TS_PHILOSOPHY.subheadline}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="show"
          variants={FADE_UP}
          className="flex flex-wrap items-center justify-center gap-3 mb-12 pointer-events-auto"
        >
          <Button size="lg" asChild>
            <a href="#philosophy">
              <Zap className="w-4 h-4" />
              Enter the Graph
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/lab">
              <Play className="w-4 h-4" />
              Run the Live Demo
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link
              href="https://github.com/BoggersTheFish"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4" />
              GitHub
            </Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="mailto:boggersthefish@boggersthefish.com">
              <ArrowRight className="w-4 h-4" />
              Vibe-Code Me
            </Link>
          </Button>
        </motion.div>

        {/* Live wave stats */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="show"
          variants={FADE_UP}
          className="inline-flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-muted-foreground bg-black/60 backdrop-blur-sm border border-ts-purple/20 rounded-full px-6 py-2.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-ts-purple/50">cycle</span>
            <span className="text-ts-purple-light font-semibold">#{cycle}</span>
          </div>
          <div className="w-px h-3 bg-ts-purple/20" />
          <div className="flex items-center gap-1.5">
            <span className="text-ts-purple/50">tension</span>
            <span className={tensionColor}>{(tension * 100).toFixed(1)}%</span>
          </div>
          <div className="w-px h-3 bg-ts-purple/20" />
          <div className="flex items-center gap-1.5">
            <span className="text-ts-purple/50">active</span>
            <span className="text-ts-purple-light">{activeNode?.label ?? "—"}</span>
          </div>
          <div className="w-px h-3 bg-ts-purple/20" />
          <div className="flex items-center gap-1.5">
            <span className="text-ts-purple/50">nodes</span>
            <span className="text-ts-purple-light">19</span>
          </div>
          <div className="w-px h-3 bg-ts-purple/20" />
          <div className="flex items-center gap-1.5">
            <span className="text-ts-purple/50">tests</span>
            <span className="text-green-400">200+ ✓</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50 text-xs font-mono animate-bounce-gentle"
      >
        <span>scroll to propagate</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}
