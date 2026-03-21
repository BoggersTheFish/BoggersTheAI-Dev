/**
 * Wave 15 — WASM Query Engine (browser fallback).
 *
 * When the Python/Docker backend is offline, the Lab page uses this engine
 * to answer queries locally in the browser. No install, no server.
 *
 * Architecture:
 *   1. A pre-seeded WaveGraphEngine is built with 12 TS-OS concept nodes.
 *   2. query(text) tokenizes the input, boosts matching nodes, runs 3 wave
 *      cycles, and returns the content of the strongest-activation node.
 *   3. The engine resets between queries so activation doesn't accumulate
 *      across sessions.
 *
 * TS Logic:
 *   - Node activation represents "how relevant this concept is right now"
 *   - Edges represent conceptual proximity (e.g. wave_engine → tension)
 *   - The wave cycle propagates query relevance through the graph
 *   - The answer comes from whichever node emerges with highest activation
 *
 * This is not a replacement for the full Python runtime — it's a graceful
 * degradation that lets users explore TS-OS concepts offline.
 */

import { WaveGraphEngine } from "./wasmTsOs";

// ─── Seed knowledge graph ────────────────────────────────────────────────────

interface SeedNode {
  id: string;
  content: string;
  activation: number;
  base_strength: number;
  stability: number;
  topics: string[];
}

interface SeedEdge {
  src: string;
  dst: string;
  weight: number;
}

const SEED_NODES: SeedNode[] = [
  {
    id: "wave_engine",
    content:
      "The Wave Engine runs continuous cycles: tension detection → emergence → activation → pruning. Each cycle propagates activation through the graph, relaxes it toward base_strength, and detects tension spikes that trigger emergence.",
    activation: 0.7,
    base_strength: 0.6,
    stability: 0.85,
    topics: ["wave", "engine", "cycle", "propagate", "relax", "tension"],
  },
  {
    id: "universal_living_graph",
    content:
      "The Universal Living Graph stores everything as nodes + weighted edges. It holds the full TS-OS state in memory (nodes dict + adjacency map) and persists to SQLite. The graph is the single source of truth for all reasoning.",
    activation: 0.65,
    base_strength: 0.55,
    stability: 0.9,
    topics: ["graph", "nodes", "edges", "sqlite", "state", "living"],
  },
  {
    id: "stability_scoring",
    content:
      "Stability (0–100%) measures how settled a node is. Low-stability nodes are 'Vibe-Code These' — the next activation targets. Stability = 1 - avg(tension_history). The wave engine lowers stability when tension is high.",
    activation: 0.5,
    base_strength: 0.5,
    stability: 0.7,
    topics: ["stability", "score", "vibe", "priority", "target"],
  },
  {
    id: "emergence",
    content:
      "Emergence happens automatically when tension crosses thresholds. New nodes, edges, tools, and agents spawn. The rules engine detects tension > 0.20 and calls spawn_emergence(), creating emergent child nodes with activation = parent * 0.5.",
    activation: 0.4,
    base_strength: 0.35,
    stability: 0.6,
    topics: ["emergence", "spawn", "new", "child", "rules", "threshold"],
  },
  {
    id: "tension",
    content:
      "Tension = |activation - base_strength|. High tension (> 0.20) means a node is over- or under-activated relative to its resting state. Tension drives emergence, pruning decisions, and the 'Lowest-Stability Nodes' list.",
    activation: 0.45,
    base_strength: 0.4,
    stability: 0.65,
    topics: ["tension", "activation", "base_strength", "threshold", "high"],
  },
  {
    id: "distributed_sharding",
    content:
      "Wave 13: Horizontal graph sharding across Redis instances using consistent hashing (adler32 % shard_count). ShardedGraphLayer routes nodes to graph_shard_N.db files. Cross-shard tension events broadcast via Redis pub/sub.",
    activation: 0.35,
    base_strength: 0.3,
    stability: 0.75,
    topics: ["distributed", "sharding", "redis", "shard", "wave13", "horizontal"],
  },
  {
    id: "wasm_port",
    content:
      "Wave 15: The TS-OS core compiled to WebAssembly (Rust + wasm-bindgen). WaveGraph struct exposes propagate(), relax_all(), run_wave_cycle(), and spawn_emergent(). TypeScript mirror works immediately without a build.",
    activation: 0.6,
    base_strength: 0.5,
    stability: 0.7,
    topics: ["wasm", "webassembly", "rust", "browser", "wave15", "port"],
  },
  {
    id: "query_processor",
    content:
      "QueryProcessor.process_query() is the main reasoning pipeline: extract topics → retrieve context from graph → check sufficiency → execute tools if needed → synthesize answer via Ollama → consolidate → write insight.",
    activation: 0.55,
    base_strength: 0.5,
    stability: 0.8,
    topics: ["query", "process", "pipeline", "reasoning", "synthesis", "ollama"],
  },
  {
    id: "boggers_runtime",
    content:
      "BoggersRuntime is the central orchestrator. It initialises the graph, starts the background wave thread, wires the query router, synthesis engine, and inference router. ask() is the main entry point.",
    activation: 0.6,
    base_strength: 0.55,
    stability: 0.85,
    topics: ["runtime", "orchestrator", "boggers", "ask", "init"],
  },
  {
    id: "synthesis_engine",
    content:
      "BoggersSynthesisEngine synthesizes answers using Ollama first (LLM summarize_and_hypothesize), then extractive fallback. It uses graph context (top-k activated nodes) to ground the synthesis in current knowledge.",
    activation: 0.5,
    base_strength: 0.45,
    stability: 0.75,
    topics: ["synthesis", "llm", "ollama", "answer", "extractive", "context"],
  },
  {
    id: "pruning",
    content:
      "Pruning removes edges whose weight falls below prune_threshold (0.25 default). This keeps the graph sparse and efficient. Nodes can also be 'collapsed' (soft-deleted) when they become redundant.",
    activation: 0.3,
    base_strength: 0.3,
    stability: 0.8,
    topics: ["pruning", "edge", "weight", "threshold", "collapse", "sparse"],
  },
  {
    id: "self_improvement",
    content:
      "The self-improvement pipeline logs high-confidence reasoning traces, builds training datasets, and optionally fine-tunes the local LLM via Unsloth. The graph tracks improvement state in runtime:self_improvement node.",
    activation: 0.35,
    base_strength: 0.3,
    stability: 0.7,
    topics: ["self", "improvement", "fine-tune", "trace", "dataset", "unsloth"],
  },
];

const SEED_EDGES: SeedEdge[] = [
  { src: "wave_engine", dst: "tension", weight: 0.9 },
  { src: "wave_engine", dst: "emergence", weight: 0.85 },
  { src: "wave_engine", dst: "universal_living_graph", weight: 0.8 },
  { src: "wave_engine", dst: "pruning", weight: 0.7 },
  { src: "tension", dst: "emergence", weight: 0.85 },
  { src: "tension", dst: "stability_scoring", weight: 0.8 },
  { src: "universal_living_graph", dst: "stability_scoring", weight: 0.75 },
  { src: "universal_living_graph", dst: "distributed_sharding", weight: 0.7 },
  { src: "boggers_runtime", dst: "wave_engine", weight: 0.9 },
  { src: "boggers_runtime", dst: "query_processor", weight: 0.85 },
  { src: "boggers_runtime", dst: "universal_living_graph", weight: 0.9 },
  { src: "query_processor", dst: "synthesis_engine", weight: 0.85 },
  { src: "query_processor", dst: "universal_living_graph", weight: 0.8 },
  { src: "synthesis_engine", dst: "boggers_runtime", weight: 0.6 },
  { src: "wasm_port", dst: "wave_engine", weight: 0.75 },
  { src: "wasm_port", dst: "universal_living_graph", weight: 0.7 },
  { src: "self_improvement", dst: "boggers_runtime", weight: 0.65 },
  { src: "distributed_sharding", dst: "wave_engine", weight: 0.65 },
];

// ─── WasmQueryEngine ─────────────────────────────────────────────────────────

export class WasmQueryEngine {
  private _engine: WaveGraphEngine;
  private _cyclesSinceReset = 0;

  constructor() {
    this._engine = this._buildSeedGraph();
  }

  private _buildSeedGraph(): WaveGraphEngine {
    const engine = new WaveGraphEngine();
    for (const node of SEED_NODES) {
      engine.addNode(
        node.id,
        node.content,
        node.activation,
        node.base_strength,
        node.stability,
      );
    }
    for (const edge of SEED_EDGES) {
      engine.addEdge(edge.src, edge.dst, edge.weight);
    }
    return engine;
  }

  /**
   * Answer a text query using the local wave graph.
   *
   * Steps:
   *   1. Reset graph to seed state (fresh activations)
   *   2. Tokenize query → boost matching nodes
   *   3. Run 4 wave cycles to propagate relevance
   *   4. Return content of the strongest node
   *
   * Returns: { answer, sourcNode, cycleCount }
   */
  query(text: string): { answer: string; sourceNode: string; cycleCount: number } {
    // Reset to seed activations for a fresh query
    this._engine = this._buildSeedGraph();
    this._cyclesSinceReset = 0;

    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3);

    // Boost nodes whose id, content, or topics contain query words
    for (const node of this._engine.getNodes()) {
      const searchable = `${node.id} ${node.content ?? ""}`.toLowerCase();
      let boost = 0;
      for (const word of words) {
        if (searchable.includes(word)) boost += 0.25;
      }
      if (boost > 0) {
        this._engine.pushActivation(node.id, Math.min(0.6, boost));
      }
    }

    // Run wave cycles to propagate relevance through the graph
    for (let i = 0; i < 4; i++) {
      this._engine.runWaveCycle(0.12, 0.92, 0.8, 0.2);
      this._cyclesSinceReset++;
    }

    const sourceNode = this._engine.strongestNodeId();
    if (!sourceNode) {
      return {
        answer: "The browser wave graph has no active nodes. This is a WASM-mode fallback — start the Docker stack for full TS-OS responses.",
        sourceNode: "",
        cycleCount: this._cyclesSinceReset,
      };
    }

    const node = this._engine.getNode(sourceNode);
    const content = node?.content ?? "No content available.";
    const answer = `[Browser WASM mode] ${content}\n\n— answered by node "${sourceNode}" after ${this._cyclesSinceReset} wave cycles. Start the Docker stack for the full LLM-powered response.`;

    return { answer, sourceNode, cycleCount: this._cyclesSinceReset };
  }

  /** Get all current node states for visualization. */
  getGraphState() {
    return this._engine.getNodes();
  }

  get cycleCount(): number {
    return this._engine.cycleCount;
  }
}

// Singleton for the lab page fallback
let _instance: WasmQueryEngine | null = null;

export function getWasmQueryEngine(): WasmQueryEngine {
  if (!_instance) _instance = new WasmQueryEngine();
  return _instance;
}
