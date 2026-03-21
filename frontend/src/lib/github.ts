import { REPOS } from "@/lib/tsData";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  homepage: string | null;
  open_issues_count: number;
  visibility: string;
  default_branch: string;
}

export interface EnrichedRepo {
  id: string;
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
  pinned: boolean;
  stability: number;
  wave: number;
  tags: readonly string[];
  homepage: string | null;
}

/** Merge GitHub API data with our local TS metadata */
function mergeWithLocalData(ghRepo: GitHubRepo): EnrichedRepo {
  const local = REPOS.find(
    (r) => r.name.toLowerCase() === ghRepo.name.toLowerCase()
  );

  return {
    id: local?.id ?? ghRepo.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    name: ghRepo.name,
    description: ghRepo.description ?? local?.description ?? "",
    url: ghRepo.html_url,
    stars: ghRepo.stargazers_count,
    forks: ghRepo.forks_count,
    language: ghRepo.language,
    topics: ghRepo.topics ?? [],
    updatedAt: ghRepo.updated_at,
    pinned: local?.pinned ?? false,
    stability: local?.stability ?? 0.5,
    wave: local?.wave ?? 0,
    tags: local?.tags ?? [],
    homepage: ghRepo.homepage,
  };
}

/** Fall back to static data if no token / API fails */
export function getStaticRepos(): EnrichedRepo[] {
  return REPOS.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    url: r.url,
    stars: 0,
    forks: 0,
    language: "Python",
    topics: [...r.tags],
    updatedAt: new Date().toISOString(),
    pinned: r.pinned,
    stability: r.stability,
    wave: r.wave,
    tags: r.tags,
    homepage: null,
  }));
}

/** Fetch all public repos from the BoggersTheFish GitHub org */
export async function fetchGitHubRepos(): Promise<EnrichedRepo[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("[github] No GITHUB_TOKEN set — using static repo data");
    return getStaticRepos();
  }

  try {
    const res = await fetch(
      "https://api.github.com/users/BoggersTheFish/repos?per_page=100&sort=updated",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 3600 }, // Cache 1 hour
      }
    );

    if (!res.ok) {
      console.error("[github] API error:", res.status, res.statusText);
      return getStaticRepos();
    }

    const ghRepos: GitHubRepo[] = await res.json();
    const enriched = ghRepos.map(mergeWithLocalData);

    // Sort: pinned first, then by wave desc
    return enriched.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.wave - a.wave;
    });
  } catch (err) {
    console.error("[github] Fetch failed:", err);
    return getStaticRepos();
  }
}
