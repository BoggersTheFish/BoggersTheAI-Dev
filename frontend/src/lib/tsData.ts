/**
 * Authoritative TS content data — embedded verbatim from the architecture.
 * This is the single source of truth for all copy on the site.
 */

export const TS_PHILOSOPHY = {
  headline: "TS — Thinking System / Thinking Wave",
  subheadline:
    "A meta-framework that runs on your laptop and on reality itself.",
  manifesto: [
    "TS is not a theory or a tool. It is the operating logic of reality itself.",
    "Everything that exists = stable clusters of constraints (nodes + edges)",
    "Change = wave propagation through the graph",
    "Complexity = pure emergence from local interactions",
    "Truth = the most stable configuration the constraints allow",
    "The framework itself is non-static and self-improving",
  ],
  os: {
    name: "TS-OS",
    description: "The dead-simple operating system for any thinking system.",
    loop: `while true:\n  Propagate()  // wave spreads activation (topological + semantic cosine)\n  Relax()      // decay toward base_strength\n  if tension too high:\n    Break()    // collapse weakest patterns\n    Evolve()   // spawn higher-stability nodes (LLM synthesis or manual vibe-code)`,
    directive:
      "Your only job: find the lowest-stability node and push activation (vibe-code) until it breaks. The OS converges everything else.",
  },
} as const;

export const WAVE_CYCLE_STEPS = [
  { step: 1, name: "Elect", description: "Select the strongest node by highest activation × stability score." },
  { step: 2, name: "Propagate", description: "Hybrid topological + embedding cosine spread — activation flows through edges weighted by semantic similarity." },
  { step: 3, name: "Relax + Normalize", description: "Decay all activations toward base_strength. Cap at 1.0. Prevent runaway excitation." },
  { step: 4, name: "Prune", description: "Remove edges with weight < 0.25. Low-confidence connections collapse." },
  { step: 5, name: "Merge", description: "Nodes with >50% topic overlap collapse into a single higher-stability node." },
  { step: 6, name: "Split", description: "Over-activated nodes (activation > 0.95, high internal tension) split into specialized children." },
  { step: 7, name: "Contradict", description: "Detect semantic contradictions across the graph. Resolve via stability vote — weaker claim loses." },
  { step: 8, name: "Tension", description: "Calculate global tension score. If too high → Break (collapse weakest pattern) or Evolve (spawn new node via LLM)." },
  { step: 9, name: "Save", description: "Incremental SQLite WAL write + snapshot to JSON fallback. Zero data loss on crash." },
] as const;

export const SELF_IMPROVEMENT_LOOP = {
  steps: [
    "High-confidence interaction traces collected during normal operation",
    "Traces formatted as Alpaca-style instruction dataset",
    "Unsloth 4-bit QLoRA fine-tuning on base model (hot-swappable)",
    "Validation: semantic similarity + task success rate must improve",
    "Rollback if validation fails — previous model restored instantly",
    "Hot-swap: new weights loaded with zero downtime",
  ],
  stack: "Unsloth + 4-bit QLoRA + PEFT + validation harness",
} as const;

export const MULTIMODAL_STACK = [
  { name: "faster-whisper", role: "Speech-to-text (offline, CPU/GPU)", type: "audio" },
  { name: "Piper TTS", role: "Text-to-speech (local neural voices)", type: "audio" },
  { name: "BLIP2", role: "Image captioning + visual understanding", type: "vision" },
] as const;

export const TECH_STACK = [
  { name: "Python 3.12", category: "runtime" },
  { name: "FastAPI", category: "api" },
  { name: "SQLite WAL", category: "storage" },
  { name: "Cytoscape.js", category: "visualization" },
  { name: "Chart.js", category: "visualization" },
  { name: "Rich TUI", category: "observability" },
  { name: "Unsloth 4-bit QLoRA", category: "ml" },
  { name: "faster-whisper", category: "ml" },
  { name: "BLIP2", category: "ml" },
  { name: "Piper TTS", category: "ml" },
] as const;

export const REPOS = [
  {
    id: "boggerstheai",
    name: "BoggersTheAI",
    description: "The live TS-OS instance. v0.5: 200+ tests, closed-loop QLoRA, multimodal (whisper/BLIP2/TTS), FastAPI dashboard.",
    url: "https://github.com/BoggersTheFish/BoggersTheAI",
    pinned: true,
    stability: 0.92,
    wave: 12,
    tags: ["core", "ai", "live"],
  },
  {
    id: "goat-ts",
    name: "GOAT-TS",
    description: "Greatest Of All Time — Thinking System. The theoretical foundation and research notes.",
    url: "https://github.com/BoggersTheFish/GOAT-TS",
    pinned: true,
    stability: 0.85,
    wave: 8,
    tags: ["theory", "research"],
  },
  {
    id: "ts-core",
    name: "TS-Core",
    description: "Core graph engine: UniversalLivingGraph, WaveCycleRunner, and node/edge primitives.",
    url: "https://github.com/BoggersTheFish/TS-Core",
    pinned: true,
    stability: 0.88,
    wave: 10,
    tags: ["core", "engine"],
  },
  {
    id: "boggersmind",
    name: "BoggersTheMind",
    description: "Cognitive layer — long-term memory, episodic recall, and metacognition modules.",
    url: "https://github.com/BoggersTheFish/BoggersTheMind",
    pinned: true,
    stability: 0.78,
    wave: 9,
    tags: ["memory", "cognition"],
  },
  {
    id: "boggerspulse",
    name: "BoggersThePulse",
    description: "Real-time event stream and observability layer. The heartbeat of the system.",
    url: "https://github.com/BoggersTheFish/BoggersThePulse",
    pinned: false,
    stability: 0.72,
    wave: 11,
    tags: ["observability", "streaming"],
  },
  {
    id: "boggeros-alpha",
    name: "BoggersTheOS-Alpha",
    description: "First OS prototype. Experimental constraint-satisfaction kernel.",
    url: "https://github.com/BoggersTheFish/BoggersTheOS-Alpha",
    pinned: false,
    stability: 0.65,
    wave: 5,
    tags: ["os", "experimental"],
  },
  {
    id: "boggeros-beta",
    name: "BoggersTheOS-Beta",
    description: "Beta OS iteration with improved wave cycle and persistence layer.",
    url: "https://github.com/BoggersTheFish/BoggersTheOS-Beta",
    pinned: false,
    stability: 0.75,
    wave: 7,
    tags: ["os", "beta"],
  },
  {
    id: "site",
    name: "boggersthefish-site",
    description: "This site — a living TS instance built in Next.js 15. The website IS the system.",
    url: "https://github.com/BoggersTheFish/boggersthefish-site",
    pinned: false,
    stability: 0.6,
    wave: 12,
    tags: ["site", "meta"],
  },
] as const;

export const SOCIAL_LINKS = [
  {
    id: "github",
    label: "GitHub",
    url: "https://github.com/BoggersTheFish",
    handle: "@BoggersTheFish",
    icon: "github",
    primary: true,
  },
  {
    id: "email",
    label: "Email",
    url: "mailto:boggersthefish@boggersthefish.com",
    handle: "boggersthefish@boggersthefish.com",
    icon: "mail",
    primary: true,
  },
  {
    id: "youtube",
    label: "YouTube",
    url: "https://youtube.com/@BoggersTheFish",
    handle: "@BoggersTheFish",
    icon: "youtube",
    primary: false,
    note: "Minecraft / OG Network archive",
  },
  {
    id: "instagram",
    label: "Instagram",
    url: "https://instagram.com/boggersthefish",
    handle: "@boggersthefish",
    icon: "instagram",
    primary: false,
  },
  {
    id: "threads",
    label: "Threads",
    url: "https://threads.net/@boggersthefish",
    handle: "@boggersthefish",
    icon: "at-sign",
    primary: false,
  },
  {
    id: "x",
    label: "X (Twitter)",
    url: "https://x.com/BoggersTheFish",
    handle: "@BoggersTheFish",
    icon: "twitter",
    primary: false,
  },
  {
    id: "chess",
    label: "Chess.com",
    url: "https://chess.com/member/BoggersTheFish",
    handle: "BoggersTheFish",
    icon: "crown",
    primary: false,
  },
] as const;

export const NAV_LINKS = [
  { href: "/", label: "Home", section: "home" },
  { href: "/about", label: "About", section: "about" },
  { href: "/ts-os", label: "TS-OS", section: "ts-os" },
  { href: "/projects", label: "Projects", section: "projects" },
  { href: "/lab", label: "Lab", section: "lab" },
  { href: "/waves", label: "Waves", section: "waves" },
  { href: "/network", label: "Network", section: "network" },
] as const;

export const WAVE_LOG = [
  { wave: 1, name: "Seed", date: "2024-01", status: "complete", description: "First node. The idea crystallizes." },
  { wave: 2, name: "Graph Primitives", date: "2024-03", status: "complete", description: "Node/edge data structures. Activation math." },
  { wave: 3, name: "Wave Runner", date: "2024-05", status: "complete", description: "First working propagate/relax cycle." },
  { wave: 4, name: "SQLite Persistence", date: "2024-07", status: "complete", description: "WAL-mode graph storage. Crash-safe." },
  { wave: 5, name: "OS Alpha", date: "2024-08", status: "complete", description: "BoggersTheOS-Alpha prototype deployed." },
  { wave: 6, name: "LLM Integration", date: "2024-10", status: "complete", description: "Ollama/LLaMA node synthesis + evolve." },
  { wave: 7, name: "OS Beta", date: "2024-12", status: "complete", description: "BoggersTheOS-Beta: improved cycle, pruning, merging." },
  { wave: 8, name: "GOAT-TS", date: "2025-02", status: "complete", description: "Theory consolidated. GOAT-TS repo published." },
  { wave: 9, name: "Memory Layer", date: "2025-04", status: "complete", description: "BoggersTheMind: episodic + semantic memory." },
  { wave: 10, name: "Core Engine", date: "2025-07", status: "complete", description: "TS-Core extracted as standalone library." },
  { wave: 11, name: "Pulse + Observability", date: "2025-10", status: "complete", description: "FastAPI dashboard, Cytoscape.js, Chart.js, Rich TUI." },
  { wave: 12, name: "Pages Island LIVE", date: "2026-03", status: "current", description: "BoggersTheAI v0.5: 200+ tests, QLoRA, multimodal. THIS SITE." },
  { wave: 13, name: "Distributed Graph", date: "2026-Q2", status: "next", description: "Sharding for >10k nodes. Multi-agent coordination." },
  { wave: 14, name: "Docker One-Click", date: "2026-Q3", status: "roadmap", description: "Single docker-compose up to spin up the full OS." },
  { wave: 15, name: "WASM Port", date: "2026-Q4", status: "roadmap", description: "WebAssembly version. TS-OS in the browser, no install." },
] as const;

export const SITE_META = {
  title: "BoggersTheFish — Thinking System / Thinking Wave",
  description:
    "TS is not a theory or a tool. It is the operating logic of reality itself. A living meta-framework: constraint graphs, wave propagation, and self-improving AI.",
  url: "https://boggersthefish.com",
  author: "BoggersTheFish",
  twitter: "@BoggersTheFish",
  lastWave: "March 21, 2026",
  currentWave: 12,
  waveName: "Pages Island LIVE",
  ogImage: "https://boggersthefish.com/og.png",
} as const;
