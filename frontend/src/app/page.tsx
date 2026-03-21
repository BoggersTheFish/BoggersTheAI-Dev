import type { Metadata } from "next";
import { HeroSection } from "@/components/hero/HeroSection";
import { TSPhilosophy } from "@/components/sections/TSPhilosophy";
import { WaveProgress } from "@/components/sections/WaveProgress";
import { REPOS, SOCIAL_LINKS, SITE_META } from "@/lib/tsData";
import Link from "next/link";
import { Github, ExternalLink, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: SITE_META.title,
  description: SITE_META.description,
};

export default function HomePage() {
  const pinnedRepos = REPOS.filter((r) => r.pinned);

  return (
    <>
      {/* Wave 2: Hero (full graph interactive — Wave 2) */}
      <HeroSection />

      {/* Divider */}
      <div className="ts-divider mx-auto max-w-7xl" />

      {/* Wave 4-area: Philosophy */}
      <TSPhilosophy />

      {/* Divider */}
      <div className="ts-divider mx-auto max-w-7xl" />

      {/* Projects teaser */}
      <section className="ts-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-3">
                <Github className="w-3 h-3" />
                Pinned Nodes
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Core Repositories
              </h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                View all 8 repos
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pinnedRepos.map((repo) => (
              <Link
                key={repo.id}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ts-card p-5 block group"
              >
                {/* Stability indicator */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {repo.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="default" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-ts-purple transition-colors flex-shrink-0" />
                </div>

                <h3 className="font-mono font-semibold text-sm text-ts-purple-light mb-2 group-hover:text-ts-purple transition-colors">
                  {repo.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                  {repo.description}
                </p>

                {/* Stability bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60 mb-1">
                    <span>stability</span>
                    <span className="text-ts-purple/70">{(repo.stability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-ts-purple/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ts-purple transition-all duration-700 group-hover:shadow-ts"
                      style={{ width: `${repo.stability * 100}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="ts-divider mx-auto max-w-7xl" />

      {/* Wave progress */}
      <WaveProgress />

      {/* Divider */}
      <div className="ts-divider mx-auto max-w-7xl" />

      {/* Connect CTA */}
      <section className="ts-section">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-ts-purple animate-ping-slow" />
            Network Node
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Push a{" "}
            <span className="ts-gradient-text">Node</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            I build systems that think like reality thinks. If you want to
            collaborate, vibe-code, or just talk about constraint graphs — the
            edge is open.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="mailto:boggersthefish@boggersthefish.com">
                boggersthefish@boggersthefish.com
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link
                href="https://github.com/BoggersTheFish"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4" />
                @BoggersTheFish
              </Link>
            </Button>
          </div>

          {/* Social grid */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {SOCIAL_LINKS.map((s) => (
              <Link
                key={s.id}
                href={s.url}
                target={s.url.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg border border-ts-purple/20 text-xs text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/40 hover:bg-ts-purple/10 transition-all duration-200 font-mono"
              >
                {s.handle}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
