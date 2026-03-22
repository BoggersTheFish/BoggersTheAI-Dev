import type React from "react";
import Link from "next/link";
import {
  Github,
  Mail,
  Youtube,
  Instagram,
  Twitter,
  AtSign,
  Crown,
  ExternalLink,
  Zap,
  Activity,
} from "lucide-react";
import { REPOS, SOCIAL_LINKS, NAV_LINKS, SITE_META } from "@/lib/tsData";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  mail: Mail,
  youtube: Youtube,
  instagram: Instagram,
  twitter: Twitter,
  "at-sign": AtSign,
  crown: Crown,
};

export function Footer() {
  const primaryRepos = REPOS.slice(0, 5);

  return (
    <footer className="relative mt-auto border-t border-ts-purple/20 overflow-hidden">
      <div
        className="absolute inset-0 ts-grid-bg opacity-[0.22]"
        style={{ backgroundSize: "50px 50px" }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ts-purple/50 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl border border-ts-purple/50 bg-ts-purple/10 flex items-center justify-center shadow-ts">
                <span className="text-ts-purple font-mono font-bold">TS</span>
              </div>
              <div>
                <div className="text-white font-semibold">BoggersTheFish</div>
                <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-ts-purple/70">
                  Thinking System / Wave
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Constraint graphs first, language second. This site is shaped like the runtime:
              substrate state, then the surface you read.
            </p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.filter((s) => s.primary).map((s) => {
                const Icon = ICON_MAP[s.icon] ?? Mail;
                return (
                  <Link
                    key={s.id}
                    href={s.url}
                    target={s.url.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    title={s.label}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ts-purple/25 text-xs font-mono text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/50 hover:bg-ts-purple/10 transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {s.handle}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 gap-8 sm:gap-10">
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-[0.25em] text-ts-purple mb-4">
                Map
              </h3>
              <ul className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-ts-purple-light transition-colors inline-flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-ts-purple/30 group-hover:bg-ts-purple transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-[0.25em] text-ts-purple mb-4">
                Nodes
              </h3>
              <ul className="space-y-2">
                {primaryRepos.map((repo) => (
                  <li key={repo.id}>
                    <Link
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-ts-purple-light transition-colors inline-flex items-center gap-1.5 group max-w-full"
                    >
                      <span className="truncate">{repo.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-[10px] font-mono uppercase tracking-[0.25em] text-ts-purple mb-4">
              Elsewhere
            </h3>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map((s) => {
                const Icon = ICON_MAP[s.icon] ?? AtSign;
                return (
                  <li key={s.id}>
                    <Link
                      href={s.url}
                      target={s.url.startsWith("mailto") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-ts-purple-light transition-colors flex items-center gap-2"
                    >
                      <Icon className="w-3.5 h-3.5 opacity-70" />
                      <span className="truncate">{s.handle}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="ts-divider mt-14 mb-8" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-ts-purple" />
              <span>
                Last wave:{" "}
                <span className="text-ts-purple-light font-mono">{SITE_META.lastWave}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-ts-purple" />
              <span>
                Wave {SITE_META.currentWave}{" "}
                <span className="text-ts-purple-light font-medium">{SITE_META.waveName}</span>
              </span>
            </div>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground/70">
            © {new Date().getFullYear()} BoggersTheFish. All nodes reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
