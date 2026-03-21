import type { Metadata } from "next";
import Link from "next/link";
import { Github, Star, GitFork, ExternalLink, Zap, Code2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchGitHubRepos, type EnrichedRepo } from "@/lib/github";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Projects — BoggersTheFish",
  description:
    "All TS-OS repositories: BoggersTheAI, GOAT-TS, TS-Core, BoggersTheMind and more. Living constraint graph nodes.",
};

export const revalidate = 3600;

function RepoCard({ repo }: { repo: EnrichedRepo }) {
  return (
    <div className={cn("ts-card p-5 flex flex-col h-full group", repo.pinned ? "border-ts-purple/40" : "")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {repo.pinned && (
            <Badge variant="current" className="text-[10px]">Pinned</Badge>
          )}
          {repo.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground/60">
          {repo.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {repo.stars}
            </span>
          )}
          {repo.forks > 0 && (
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              {repo.forks}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="font-mono font-bold text-sm text-ts-purple-light mb-2 group-hover:text-ts-purple transition-colors">
        {repo.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
        {repo.description || "No description available."}
      </p>

      {/* Wave + stability */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
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

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono">
          {repo.language && (
            <span className="flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              {repo.language}
            </span>
          )}
          {repo.wave > 0 && <span>Wave {repo.wave}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {repo.homepage && (
            <Link
              href={repo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded border border-ts-purple/20 text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/40 transition-all"
              title="Live site"
            >
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          <Link
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded border border-ts-purple/20 text-muted-foreground hover:text-ts-purple-light hover:border-ts-purple/40 transition-all"
            title="GitHub"
          >
            <Github className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  const repos = await fetchGitHubRepos();
  const pinned = repos.filter((r) => r.pinned);
  const rest = repos.filter((r) => !r.pinned);

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 ts-grid-bg opacity-25" style={{ backgroundSize: "50px 50px" }} />
        <div className="relative max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ts-purple/30 bg-ts-purple/5 text-xs font-mono text-ts-purple mb-6">
            <Github className="w-3 h-3" />
            Projects Cluster — {repos.length} nodes
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
                The <span className="ts-gradient-text">Repository</span>
                <br />Graph
              </h1>
              <p className="text-muted-foreground max-w-xl">
                Every repo is a node in the TS graph. Pinned = highest stability.
                Hover to see activation levels. Click to open on GitHub.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link
                href="https://github.com/BoggersTheFish"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4" />
                View all on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="ts-divider mx-auto max-w-6xl" />

      {/* Pinned repos */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-ts-purple" />
            <h2 className="text-xl font-bold text-white">Core Nodes</h2>
            <span className="text-xs text-muted-foreground font-mono">({pinned.length} pinned)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pinned.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </div>
      </section>

      {/* All other repos */}
      {rest.length > 0 && (
        <section className="pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Github className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xl font-bold text-white">All Nodes</h2>
              <span className="text-xs text-muted-foreground font-mono">({rest.length} repos)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Install CTA */}
      <div className="ts-divider mx-auto max-w-6xl" />
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Run Locally in 60 Seconds</h2>
          <div className="ts-code text-xs mb-6 text-left">
            <pre>{`git clone https://github.com/BoggersTheFish/BoggersTheAI
cd BoggersTheAI
pip install -r requirements.txt
cp config.example.yaml config.yaml
python main.py`}</pre>
          </div>
          <Button asChild>
            <Link href="/lab">
              Go to the Lab
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
