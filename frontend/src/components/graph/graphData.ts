/**
 * Hero graph data — seeded from real TS-OS architecture.
 * Nodes represent real concepts; edges are real relationships.
 */

export interface GraphNode {
  id: string;
  label: string;
  activation: number;
  stability: number;
  baseStrength: number;
  section?: string;
  isVisitor?: boolean;
  isCore?: boolean;
  cluster: "core" | "ai" | "projects" | "meta" | "visitor";
  edges?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  __bckgDimensions?: [number, number];
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
  isActive?: boolean;
}

export const HERO_GRAPH_NODES: GraphNode[] = [
  // Core cluster
  {
    id: "ts-core",
    label: "TS Core",
    activation: 0.95,
    stability: 0.95,
    baseStrength: 0.8,
    section: "philosophy",
    isCore: true,
    cluster: "core",
    edges: ["boggerstheai", "goat-ts", "wave-cycle", "universal-graph", "ts-philosophy"],
  },
  {
    id: "universal-graph",
    label: "UniversalLivingGraph",
    activation: 0.85,
    stability: 0.9,
    baseStrength: 0.75,
    section: "ts-os",
    cluster: "core",
    edges: ["ts-core", "wave-cycle", "sqlite"],
  },
  {
    id: "wave-cycle",
    label: "WaveCycleRunner",
    activation: 0.82,
    stability: 0.88,
    baseStrength: 0.7,
    section: "ts-os",
    cluster: "core",
    edges: ["ts-core", "universal-graph", "self-improve"],
  },
  {
    id: "ts-philosophy",
    label: "TS Philosophy",
    activation: 0.9,
    stability: 0.98,
    baseStrength: 0.9,
    section: "philosophy",
    cluster: "meta",
    edges: ["ts-core", "truth", "complexity"],
  },
  {
    id: "sqlite",
    label: "SQLite WAL",
    activation: 0.6,
    stability: 0.92,
    baseStrength: 0.6,
    section: "ts-os",
    cluster: "core",
    edges: ["universal-graph"],
  },

  // AI cluster
  {
    id: "boggerstheai",
    label: "BoggersTheAI v0.5",
    activation: 0.88,
    stability: 0.92,
    baseStrength: 0.75,
    section: "projects",
    cluster: "ai",
    edges: ["ts-core", "self-improve", "multimodal", "dashboard", "wave-12"],
  },
  {
    id: "self-improve",
    label: "Self-Improve Loop",
    activation: 0.72,
    stability: 0.82,
    baseStrength: 0.65,
    section: "ts-os",
    cluster: "ai",
    edges: ["boggerstheai", "wave-cycle", "qlora"],
  },
  {
    id: "qlora",
    label: "Unsloth 4-bit QLoRA",
    activation: 0.65,
    stability: 0.78,
    baseStrength: 0.6,
    section: "ts-os",
    cluster: "ai",
    edges: ["self-improve"],
  },
  {
    id: "multimodal",
    label: "Multimodal Stack",
    activation: 0.62,
    stability: 0.75,
    baseStrength: 0.6,
    section: "ts-os",
    cluster: "ai",
    edges: ["boggerstheai", "whisper", "blip2"],
  },
  {
    id: "whisper",
    label: "faster-whisper",
    activation: 0.5,
    stability: 0.78,
    baseStrength: 0.5,
    section: "ts-os",
    cluster: "ai",
    edges: ["multimodal"],
  },
  {
    id: "blip2",
    label: "BLIP2",
    activation: 0.48,
    stability: 0.75,
    baseStrength: 0.48,
    section: "ts-os",
    cluster: "ai",
    edges: ["multimodal"],
  },
  {
    id: "dashboard",
    label: "FastAPI Dashboard",
    activation: 0.6,
    stability: 0.8,
    baseStrength: 0.55,
    section: "lab",
    cluster: "ai",
    edges: ["boggerstheai", "cytoscape"],
  },
  {
    id: "cytoscape",
    label: "Cytoscape.js",
    activation: 0.55,
    stability: 0.8,
    baseStrength: 0.5,
    section: "lab",
    cluster: "ai",
    edges: ["dashboard"],
  },

  // Projects cluster
  {
    id: "goat-ts",
    label: "GOAT-TS",
    activation: 0.7,
    stability: 0.85,
    baseStrength: 0.68,
    section: "projects",
    cluster: "projects",
    edges: ["ts-core", "boggersthemind"],
  },
  {
    id: "boggersthemind",
    label: "BoggersTheMind",
    activation: 0.62,
    stability: 0.78,
    baseStrength: 0.6,
    section: "projects",
    cluster: "projects",
    edges: ["goat-ts", "ts-core"],
  },

  // Meta cluster
  {
    id: "wave-12",
    label: "Wave 12 — LIVE",
    activation: 0.95,
    stability: 0.9,
    baseStrength: 0.8,
    section: "waves",
    cluster: "meta",
    edges: ["boggerstheai", "ts-core"],
  },
  {
    id: "truth",
    label: "Truth = Stable Config",
    activation: 0.7,
    stability: 0.95,
    baseStrength: 0.7,
    section: "philosophy",
    cluster: "meta",
    edges: ["ts-philosophy", "complexity"],
  },
  {
    id: "complexity",
    label: "Complexity = Emergence",
    activation: 0.65,
    stability: 0.9,
    baseStrength: 0.65,
    section: "philosophy",
    cluster: "meta",
    edges: ["truth", "ts-philosophy"],
  },

  // Visitor
  {
    id: "visitor",
    label: "You (Visitor)",
    activation: 0.15,
    stability: 0.3,
    baseStrength: 0.2,
    section: "home",
    isVisitor: true,
    cluster: "visitor",
    edges: ["wave-12", "ts-philosophy", "boggerstheai"],
  },
];

export const HERO_GRAPH_LINKS: GraphLink[] = [
  // Core connections
  { source: "ts-core", target: "boggerstheai", strength: 0.9 },
  { source: "ts-core", target: "goat-ts", strength: 0.8 },
  { source: "ts-core", target: "wave-cycle", strength: 0.85 },
  { source: "ts-core", target: "universal-graph", strength: 0.9 },
  { source: "ts-core", target: "ts-philosophy", strength: 0.8 },

  // Universal graph
  { source: "universal-graph", target: "wave-cycle", strength: 0.85 },
  { source: "universal-graph", target: "sqlite", strength: 0.75 },

  // Wave cycle
  { source: "wave-cycle", target: "self-improve", strength: 0.7 },

  // BoggersTheAI cluster
  { source: "boggerstheai", target: "self-improve", strength: 0.75 },
  { source: "boggerstheai", target: "multimodal", strength: 0.7 },
  { source: "boggerstheai", target: "dashboard", strength: 0.65 },
  { source: "boggerstheai", target: "wave-12", strength: 0.85 },

  // Self improve
  { source: "self-improve", target: "qlora", strength: 0.8 },

  // Multimodal
  { source: "multimodal", target: "whisper", strength: 0.75 },
  { source: "multimodal", target: "blip2", strength: 0.7 },

  // Dashboard
  { source: "dashboard", target: "cytoscape", strength: 0.7 },

  // Projects
  { source: "goat-ts", target: "boggersthemind", strength: 0.65 },

  // Meta
  { source: "ts-philosophy", target: "truth", strength: 0.8 },
  { source: "ts-philosophy", target: "complexity", strength: 0.75 },
  { source: "truth", target: "complexity", strength: 0.6 },

  // Visitor connections (weak)
  { source: "visitor", target: "wave-12", strength: 0.3 },
  { source: "visitor", target: "ts-philosophy", strength: 0.25 },
  { source: "visitor", target: "boggerstheai", strength: 0.25 },
];

export const INITIAL_HERO_GRAPH = {
  nodes: HERO_GRAPH_NODES,
  links: HERO_GRAPH_LINKS,
};

// Network graph data for /network page (social links)
export interface NetworkNode {
  id: string;
  label: string;
  url: string;
  category: "github" | "social" | "content" | "misc";
  activation: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  __bckgDimensions?: [number, number];
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  strength: number;
}

export const NETWORK_GRAPH_DATA = {
  nodes: [
    { id: "me", label: "BoggersTheFish", url: "https://boggersthefish.com", category: "misc" as const, activation: 1.0 },
    { id: "github-profile", label: "GitHub Profile", url: "https://github.com/BoggersTheFish", category: "github" as const, activation: 0.9 },
    { id: "boggerstheai-repo", label: "BoggersTheAI", url: "https://github.com/BoggersTheFish/BoggersTheAI", category: "github" as const, activation: 0.85 },
    { id: "goat-ts-repo", label: "GOAT-TS", url: "https://github.com/BoggersTheFish/GOAT-TS", category: "github" as const, activation: 0.75 },
    { id: "ts-core-repo", label: "TS-Core", url: "https://github.com/BoggersTheFish/TS-Core", category: "github" as const, activation: 0.78 },
    { id: "boggersmind-repo", label: "BoggersTheMind", url: "https://github.com/BoggersTheFish/BoggersTheMind", category: "github" as const, activation: 0.7 },
    { id: "boggerspulse-repo", label: "BoggersThePulse", url: "https://github.com/BoggersTheFish/BoggersThePulse", category: "github" as const, activation: 0.65 },
    { id: "boggeros-alpha-repo", label: "BoggersTheOS-Alpha", url: "https://github.com/BoggersTheFish/BoggersTheOS-Alpha", category: "github" as const, activation: 0.55 },
    { id: "boggeros-beta-repo", label: "BoggersTheOS-Beta", url: "https://github.com/BoggersTheFish/BoggersTheOS-Beta", category: "github" as const, activation: 0.62 },
    { id: "email", label: "Email", url: "mailto:boggersthefish@boggersthefish.com", category: "social" as const, activation: 0.8 },
    { id: "youtube", label: "YouTube", url: "https://youtube.com/@BoggersTheFish", category: "content" as const, activation: 0.7 },
    { id: "instagram", label: "Instagram", url: "https://instagram.com/boggersthefish", category: "social" as const, activation: 0.65 },
    { id: "threads", label: "Threads", url: "https://threads.net/@boggersthefish", category: "social" as const, activation: 0.6 },
    { id: "x", label: "X / Twitter", url: "https://x.com/BoggersTheFish", category: "social" as const, activation: 0.6 },
    { id: "chess", label: "Chess.com", url: "https://chess.com/member/BoggersTheFish", category: "misc" as const, activation: 0.5 },
    { id: "minecraft", label: "Minecraft / OG Network", url: "https://youtube.com/@BoggersTheFish", category: "content" as const, activation: 0.55 },
  ],
  links: [
    { source: "me", target: "github-profile", strength: 0.9 },
    { source: "me", target: "email", strength: 0.85 },
    { source: "me", target: "youtube", strength: 0.75 },
    { source: "me", target: "instagram", strength: 0.7 },
    { source: "me", target: "threads", strength: 0.65 },
    { source: "me", target: "x", strength: 0.65 },
    { source: "me", target: "chess", strength: 0.5 },
    { source: "me", target: "minecraft", strength: 0.55 },
    { source: "github-profile", target: "boggerstheai-repo", strength: 0.9 },
    { source: "github-profile", target: "goat-ts-repo", strength: 0.8 },
    { source: "github-profile", target: "ts-core-repo", strength: 0.82 },
    { source: "github-profile", target: "boggersmind-repo", strength: 0.75 },
    { source: "github-profile", target: "boggerspulse-repo", strength: 0.7 },
    { source: "github-profile", target: "boggeros-alpha-repo", strength: 0.6 },
    { source: "github-profile", target: "boggeros-beta-repo", strength: 0.65 },
    { source: "youtube", target: "minecraft", strength: 0.8 },
    { source: "instagram", target: "threads", strength: 0.6 },
  ],
};
