"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Github,
  Mail,
  Youtube,
  Instagram,
  Twitter,
  AtSign,
  Crown,
  ExternalLink,
} from "lucide-react";
import { NetworkGraph } from "@/components/graph/NetworkGraph";
import { SOCIAL_LINKS, REPOS } from "@/lib/tsData";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  github: { label: "GitHub", color: "text-ts-purple-light" },
  social: { label: "Social", color: "text-blue-400" },
  content: { label: "Content", color: "text-red-400" },
  misc: { label: "Misc", color: "text-green-400" },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  mail: Mail,
  youtube: Youtube,
  instagram: Instagram,
  twitter: Twitter,
  "at-sign": AtSign,
  crown: Crown,
};

export default function NetworkPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 ts-grid-bg opacity-25" style={{ backgroundSize: "50px 50px" }} />
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-ts-purple animate-ping-slow" />
              Network — Connection Nodes
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
              The Full
              <span className="ts-gradient-text"> Network</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Every link, repo, and social profile as a force graph.
              Click any node to open it. Activation ripples on click.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Force graph — full viewport width */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <div
            className="ts-card overflow-hidden border-ts-purple/30"
            style={{ height: "60vh", minHeight: 400 }}
          >
            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-ts-purple/20 bg-ts-purple/5">
              {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className={`w-2 h-2 rounded-full bg-current ${val.color}`} />
                  <span className="text-muted-foreground">{val.label}</span>
                </div>
              ))}
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                Click any node to open
              </span>
            </div>
            <div className="h-[calc(100%-40px)]">
              <NetworkGraph />
            </div>
          </div>
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-6xl" />

      {/* Links grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Social */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Social
              </h2>
              <div className="space-y-2">
                {SOCIAL_LINKS.map((s) => {
                  const Icon = ICON_MAP[s.icon] ?? AtSign;
                  return (
                    <Link
                      key={s.id}
                      href={s.url}
                      target={s.url.startsWith("mailto") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-ts-purple/10 hover:border-ts-purple/40 hover:bg-ts-purple/5 transition-all group"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-ts-purple-light transition-colors flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground group-hover:text-ts-purple-light transition-colors truncate font-mono">
                          {s.handle}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-ts-purple flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Repos */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ts-purple" />
                GitHub Repos
              </h2>
              <div className="space-y-2">
                {REPOS.map((repo) => (
                  <Link
                    key={repo.id}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-ts-purple/10 hover:border-ts-purple/40 hover:bg-ts-purple/5 transition-all group"
                  >
                    <Github className="w-4 h-4 text-muted-foreground group-hover:text-ts-purple-light transition-colors flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-foreground group-hover:text-ts-purple-light transition-colors truncate">
                        {repo.name}
                      </div>
                      {repo.pinned && (
                        <Badge variant="default" className="text-[9px] h-4 mt-0.5">pinned</Badge>
                      )}
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-ts-purple flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Content
              </h2>
              <div className="space-y-3">
                {/* YouTube card */}
                <Link
                  href="https://youtube.com/@BoggersTheFish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block ts-card p-4 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Youtube className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-white group-hover:text-ts-purple-light transition-colors">
                      @BoggersTheFish
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/40 ml-auto" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    YouTube channel — Minecraft OG Network archive + dev content.
                    The origin of the constraint graph obsession.
                  </p>
                </Link>

                {/* Chess.com */}
                <Link
                  href="https://chess.com/member/BoggersTheFish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block ts-card p-4 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-white group-hover:text-ts-purple-light transition-colors">
                      Chess.com
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/40 ml-auto" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chess — the original constraint-propagation game.
                    Every position is a node state.
                  </p>
                </Link>

                {/* Minecraft */}
                <Link
                  href="https://youtube.com/@BoggersTheFish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block ts-card p-4 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg leading-none flex-shrink-0">⛏️</span>
                    <span className="text-sm font-semibold text-white group-hover:text-ts-purple-light transition-colors">
                      Minecraft / OG Network
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/40 ml-auto" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    OG Network history + Minecraft skin archive.
                    Survival base-building = graph optimization.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
