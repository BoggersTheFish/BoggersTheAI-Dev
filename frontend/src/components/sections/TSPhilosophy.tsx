"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { TS_PHILOSOPHY, WAVE_CYCLE_STEPS } from "@/lib/tsData";
import { cn } from "@/lib/utils";

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function TSPhilosophy() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="philosophy"
      className="ts-section relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-ts-purple/3 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          custom={0}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={FADE_UP}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-ts-purple" />
            Core Philosophy
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            The Operating Logic of Reality
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Not a framework you use — a framework that describes everything that
            already exists, including itself.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Manifesto */}
          <div className="space-y-4">
            {TS_PHILOSOPHY.manifesto.map((line, i) => (
              <motion.div
                key={i}
                custom={i + 1}
                initial="hidden"
                animate={inView ? "show" : "hidden"}
                variants={FADE_UP}
                className={cn(
                  "ts-card p-5 flex items-start gap-4 group",
                  i === 0 ? "border-ts-purple/40" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 font-mono text-xs font-bold transition-all duration-300",
                    i === 0
                      ? "border-ts-purple bg-ts-purple/20 text-ts-purple-light shadow-ts"
                      : "border-ts-purple/30 bg-ts-purple/5 text-ts-purple/60 group-hover:border-ts-purple group-hover:bg-ts-purple/20 group-hover:text-ts-purple-light group-hover:shadow-ts"
                  )}
                >
                  {i === 0 ? "∞" : i}
                </div>
                <p
                  className={cn(
                    "text-sm leading-relaxed transition-colors duration-300",
                    i === 0
                      ? "text-ts-purple-light font-medium"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {line}
                </p>
              </motion.div>
            ))}
          </div>

          {/* TS-OS Code Block */}
          <motion.div
            custom={7}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            variants={FADE_UP}
            className="space-y-6"
          >
            <div className="ts-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-ts-purple/20 bg-ts-purple/5">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-2">
                  ts_os.py — {TS_PHILOSOPHY.os.name}
                </span>
              </div>
              <div className="p-5 font-mono text-sm leading-relaxed">
                <pre className="whitespace-pre text-left overflow-x-auto">
                  <code>
                    {TS_PHILOSOPHY.os.loop.split("\n").map((line, i) => {
                      const isComment = line.includes("//");
                      const parts = isComment ? line.split("//") : [line];
                      return (
                        <div key={i} className="min-h-[1.4em]">
                          <span
                            className={
                              line.trim().startsWith("while") ||
                              line.trim().startsWith("if")
                                ? "text-ts-purple font-bold"
                                : "text-ts-purple-light"
                            }
                          >
                            {parts[0]}
                          </span>
                          {parts[1] && (
                            <span className="text-muted-foreground/60 text-xs italic">
                              //{parts[1]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </div>
            </div>

            <div className="ts-card p-5 border-ts-purple/30 bg-ts-purple/5">
              <p className="text-sm text-ts-purple-light font-medium leading-relaxed">
                &ldquo;{TS_PHILOSOPHY.os.directive}&rdquo;
              </p>
            </div>

            {/* Wave cycle preview */}
            <div className="ts-card p-5 space-y-3">
              <div className="text-xs font-mono text-ts-purple uppercase tracking-widest mb-3">
                Full Wave Cycle (11 steps)
              </div>
              <div className="space-y-2">
                {WAVE_CYCLE_STEPS.slice(0, 5).map((step) => (
                  <div
                    key={step.step}
                    className="flex items-start gap-3 text-xs group"
                  >
                    <span className="w-5 h-5 rounded border border-ts-purple/30 flex items-center justify-center font-mono text-ts-purple/60 flex-shrink-0 group-hover:border-ts-purple group-hover:text-ts-purple transition-all">
                      {step.step}
                    </span>
                    <div>
                      <span className="text-ts-purple-light font-medium">{step.name}</span>
                      <span className="text-muted-foreground ml-2">{step.description.slice(0, 60)}…</span>
                    </div>
                  </div>
                ))}
              </div>
              <a
                href="/ts-os"
                className="text-xs text-ts-purple hover:text-ts-purple-light font-mono transition-colors flex items-center gap-1 mt-1"
              >
                View all 11 steps →
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
