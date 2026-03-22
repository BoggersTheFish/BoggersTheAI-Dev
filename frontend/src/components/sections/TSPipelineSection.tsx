"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowDown, Cpu, MessageSquare, ShieldCheck } from "lucide-react";
import { TS_SITE_PIPELINE } from "@/lib/tsData";
import { cn } from "@/lib/utils";

const ICONS = [Cpu, MessageSquare, ShieldCheck] as const;

const FADE = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function TSPipelineSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      id="pipeline"
      className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ts-purple/40 to-transparent" />
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[min(90vw,520px)] h-[min(90vw,520px)] rounded-full bg-ts-purple/[0.04] blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          custom={0}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={FADE}
          className="text-center mb-14"
        >
          <div className="ts-phase-pill mb-5 justify-center">
            <span className="h-1 w-1 rounded-full bg-ts-purple shadow-ts" />
            Execution order
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Substrate first. Surface second.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            The backend runs graph phases to completion, then streams language. The site mirrors
            that split: memory and structure are not an afterthought to the chat bubble.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {TS_SITE_PIPELINE.map((step, i) => {
            const Icon = ICONS[i] ?? Cpu;
            return (
              <motion.div
                key={step.phase}
                custom={i + 1}
                initial="hidden"
                animate={inView ? "show" : "hidden"}
                variants={FADE}
                className="relative"
              >
                {i < TS_SITE_PIPELINE.length - 1 && (
                  <div
                    className="hidden md:flex absolute -right-3 lg:-right-4 top-1/2 -translate-y-1/2 z-10 text-ts-purple/35"
                    aria-hidden
                  >
                    <ArrowDown className="w-4 h-4 rotate-[-90deg]" />
                  </div>
                )}
                <div
                  className={cn(
                    "ts-surface-panel h-full p-6 flex flex-col gap-4",
                    "hover:border-ts-purple/45 transition-colors duration-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[10px] text-ts-purple/60 tracking-widest">
                      {step.phase}
                    </span>
                    <div className="w-10 h-10 rounded-xl border border-ts-purple/30 bg-ts-purple/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-ts-purple-light" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{step.name}</h3>
                    <p className="text-xs font-mono text-ts-purple-light/90 mb-3">{step.role}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
