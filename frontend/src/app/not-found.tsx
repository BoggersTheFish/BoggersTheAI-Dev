"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const TENSION_MESSAGES = [
  "Node collapsed under excessive tension.",
  "Edge weight < 0.25 — pruned from graph.",
  "Activation propagation reached dead end.",
  "Constraint contradiction detected — pattern dissolved.",
  "Wave cycle could not stabilize this path.",
];

export default function NotFound() {
  const [msg, setMsg] = useState(TENSION_MESSAGES[0]);
  const [particles, setParticles] = useState<Array<{ x: number; y: number; delay: number; size: number }>>([]);

  useEffect(() => {
    const idx = Math.floor(Math.random() * TENSION_MESSAGES.length);
    setMsg(TENSION_MESSAGES[idx]);
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: i * 0.3,
        size: Math.random() * 4 + 2,
      }))
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* Grid background */}
      <div className="absolute inset-0 ts-grid-bg opacity-40" style={{ backgroundSize: "50px 50px" }} />

      {/* Scattered particles (dead nodes) */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-ts-purple/30 border border-ts-purple/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="relative z-10 text-center max-w-xl mx-auto px-4">
        {/* Error code */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-ts-purple/40 bg-ts-purple/10 mb-6 relative">
            <span className="text-3xl font-mono font-bold ts-gradient-text">
              404
            </span>
            {/* Broken ring */}
            <motion.div
              className="absolute inset-0 rounded-full border border-ts-purple/20"
              animate={{ scale: [1, 2], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-xs font-mono text-red-400 mb-4">
            <Zap className="w-3 h-3" />
            Tension too high — node collapsed
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Wave Couldn&apos;t
            <br />
            <span className="ts-gradient-text">Propagate</span>
          </h1>

          <p className="text-muted-foreground mb-2 leading-relaxed">
            {msg}
          </p>
          <p className="text-muted-foreground/60 text-sm font-mono mb-8">
            The path you requested doesn&apos;t exist in this graph.
          </p>
        </motion.div>

        {/* TS-OS advice */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="ts-card p-4 mb-8 text-left font-mono text-sm"
        >
          <div className="text-ts-purple/60 text-xs mb-2"># TS-OS recovery suggestion</div>
          <div className="text-ts-purple-light/80">
            <span className="text-ts-purple">Evolve</span>() {" → "}
            <span className="text-green-400/80">spawn higher-stability node</span>
          </div>
          <div className="text-muted-foreground/60 text-xs mt-1">
            Navigate back to a stable node and re-propagate.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg">
            <Link href="/">
              <Home className="w-4 h-4" />
              Return to TS Core
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            <RefreshCw className="w-4 h-4" />
            Evolve Back
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
