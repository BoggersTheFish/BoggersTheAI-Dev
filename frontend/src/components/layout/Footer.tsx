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
  return (
    <footer className="relative border-t border-ts-purple/20 bg-black overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 ts-grid-bg opacity-30"
        style={{ backgroundSize: "50px 50px" }}
      />
      {/* Fade-up gradient from content */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ts-purple/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full border-2 border-ts-purple flex items-center justify-center shadow-ts flex-shrink-0">
                <span className="text-ts-purple font-mono font-bold text-sm">TS</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">BoggersTheFish</div>
                <div className="text-ts-purple-light text-[10px] font-mono tracking-widest uppercase opacity-70">
                  Thinking System
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed mb-4">
              TS is not a theory or a tool. It is the operating logic of reality itself — constraint graphs, wave propagation, and self-improving AI.
            </p>
            {/* Social links */}
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
                    className="w-8 h-8 rounded-md border border-ts-purple/20 flex items-center justify-center text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/50 hover:bg-ts-purple/10 hover:shadow-ts transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </Link>
                );
              })}
              {SOCIAL_LINKS.filter((s) => !s.primary).map((s) => {
                const Icon = ICON_MAP[s.icon] ?? AtSign;
                return (
                  <Link
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label + (s.note ? ` — ${s.note}` : "")}
                    className="w-8 h-8 rounded-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/40 hover:bg-ts-purple/10 transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ts-purple mb-4">
              Navigate
            </h3>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-ts-purple-light text-sm transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-ts-purple/40 group-hover:bg-ts-purple group-hover:shadow-ts transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Repositories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ts-purple mb-4">
              Repositories
            </h3>
            <ul className="space-y-2">
              {REPOS.map((repo) => (
                <li key={repo.id}>
                  <Link
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-ts-purple-light text-sm transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-ts-purple/40 group-hover:bg-ts-purple group-hover:shadow-ts transition-all duration-200" />
                    <span className="truncate">{repo.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ts-purple mb-4">
              Connect
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
                      className="text-muted-foreground hover:text-ts-purple-light text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <Icon className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100 group-hover:text-ts-purple transition-all" />
                      <span className="truncate">{s.handle}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="ts-divider mt-12 mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-ts-purple animate-pulse" />
              <span>
                This site is a living TS instance — last wave:{" "}
                <span className="text-ts-purple-light font-medium">
                  {SITE_META.lastWave}
                </span>
              </span>
            </div>
            <span className="hidden sm:inline text-ts-purple/30">|</span>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-ts-purple" />
              <span>
                Wave {SITE_META.currentWave} —{" "}
                <span className="text-ts-purple-light">{SITE_META.waveName}</span>
              </span>
            </div>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground/60">
            © 2026 BoggersTheFish. All nodes reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
