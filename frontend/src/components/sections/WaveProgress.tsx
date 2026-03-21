"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle, Circle, Zap, Clock } from "lucide-react";
import { WAVE_LOG } from "@/lib/tsData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  complete: {
    icon: CheckCircle,
    badge: "complete" as const,
    label: "Complete",
    color: "text-green-400",
  },
  current: {
    icon: Zap,
    badge: "current" as const,
    label: "Live",
    color: "text-ts-purple-light",
  },
  next: {
    icon: Circle,
    badge: "low-stability" as const,
    label: "Next",
    color: "text-yellow-400",
  },
  roadmap: {
    icon: Clock,
    badge: "roadmap" as const,
    label: "Roadmap",
    color: "text-muted-foreground",
  },
};

export function WaveProgress() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} id="waves" className="ts-section relative overflow-hidden">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-ts-purple/4 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-4">
            <Zap className="w-3 h-3" />
            Wave Progress Log
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Evolution of the System
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Every wave is a completed node. The graph grows with each cycle.
            Currently on Wave 12 — fully live.
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
        >
          {[
            { label: "Waves Complete", value: "12" },
            { label: "Tests Passing", value: "200+" },
            { label: "Repos Live", value: "8" },
            { label: "Current Wave", value: "#12 LIVE" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="ts-card p-4 text-center"
            >
              <div className="text-2xl font-bold ts-gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Wave timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-ts-purple/60 via-ts-purple/20 to-transparent" />

          <div className="space-y-3">
            {WAVE_LOG.map((wave, i) => {
              const config = STATUS_CONFIG[wave.status];
              const Icon = config.icon;
              const isCurrent = wave.status === "current";
              const isFuture = wave.status === "roadmap" || wave.status === "next";

              return (
                <motion.div
                  key={wave.wave}
                  initial={{ opacity: 0, x: -16 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  className={cn(
                    "relative flex items-start gap-4 sm:gap-6 pl-10 sm:pl-14",
                    isFuture ? "opacity-60" : ""
                  )}
                >
                  {/* Node dot */}
                  <div
                    className={cn(
                      "absolute left-2 sm:left-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      "mt-3 -translate-x-1/2",
                      isCurrent
                        ? "border-ts-purple bg-ts-purple/30 shadow-ts animate-pulse-glow"
                        : wave.status === "complete"
                        ? "border-green-500/60 bg-green-500/10"
                        : "border-ts-purple/30 bg-black"
                    )}
                  >
                    <Icon className={cn("w-2.5 h-2.5", config.color)} />
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      "ts-card p-4 flex-1 flex flex-col sm:flex-row sm:items-center gap-3",
                      isCurrent ? "border-ts-purple/50 shadow-ts" : ""
                    )}
                  >
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono text-ts-purple/60 w-12">
                        #{wave.wave.toString().padStart(2, "0")}
                      </span>
                      <Badge variant={config.badge}>{config.label}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-semibold text-sm", isCurrent ? "text-ts-purple-light" : "text-foreground")}>
                          {wave.name}
                        </span>
                        <span className="text-xs text-muted-foreground/60 font-mono">
                          {wave.date}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {wave.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
