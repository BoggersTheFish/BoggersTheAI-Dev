/**
 * Wave 15 — TS-OS Mini: in-browser wave engine.
 *
 * Two layers:
 *   1. WaveGraphEngine class  — pure TypeScript mirror of wasm/ts-os-mini/src/lib.rs.
 *      Works immediately with zero build steps. Used by WasmWaveDemo and WasmQueryEngine.
 *   2. tryLoadWasm()          — dynamically imports the compiled WASM build from
 *      /public/wasm/ts-os-mini/ when available, then swaps in native WASM execution.
 *
 * The Python/Docker runtime remains primary. This module enables:
 *   • /wasm page  — interactive wave cycle demo running 100% in the browser
 *   • /lab page   — WASM fallback when the Docker stack is offline
 *
 * TS Logic mirrored:
 *   propagate()   — topo signal: activation * edge_weight * spread * damping
 *   relaxAll()    — decay toward base_strength * relax_decay
 *   detectTension — |activation - base_strength| > threshold
 *   runWaveCycle  — propagate → relax → return tension map
 *   spawnEmergent — create child node when tension spikes (emergence)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WasmNodeState {
  id: string;
  activation: number;
  base_strength: number;
  stability: number;
  last_wave: number;
  collapsed: boolean;
  content?: string;
}

export interface WaveTensions {
  [nodeId: string]: number;
}

export interface WaveCycleResult {
  tensions: WaveTensions;
  cycleCount: number;
  emergentNodeId?: string;
}

// ─── WaveGraphEngine — pure TypeScript implementation ─────────────────────────

export class WaveGraphEngine {
  private nodes: Map<string, WasmNodeState> = new Map();
  private edges: Array<{ src: string; dst: string; weight: number }> = [];
  private adjacency: Map<string, Array<{ dst: string; weight: number }>> = new Map();
  private _cycleCount = 0;

  /** Add or upsert a node. */
  addNode(
    id: string,
    content: string,
    activation: number,
    baseStrength: number,
    stability: number,
  ): void {
    const existing = this.nodes.get(id);
    if (existing) {
      existing.activation = Math.max(0, Math.min(1, activation));
      existing.base_strength = Math.max(0, Math.min(1, baseStrength));
      existing.stability = Math.max(0, Math.min(1, stability));
      existing.content = content;
      return;
    }
    this.nodes.set(id, {
      id,
      content,
      activation: Math.max(0, Math.min(1, activation)),
      base_strength: Math.max(0, Math.min(1, baseStrength)),
      stability: Math.max(0, Math.min(1, stability)),
      last_wave: 0,
      collapsed: false,
    });
    this.adjacency.set(id, []);
  }

  /** Add a directed edge (src → dst). */
  addEdge(src: string, dst: string, weight: number): void {
    if (!this.nodes.has(src) || !this.nodes.has(dst)) return;
    const w = Math.max(0, Math.min(1, weight));
    // Upsert
    const existing = this.edges.find((e) => e.src === src && e.dst === dst);
    if (existing) { existing.weight = w; return; }
    this.edges.push({ src, dst, weight: w });
    const adj = this.adjacency.get(src) ?? [];
    adj.push({ dst, weight: w });
    this.adjacency.set(src, adj);
  }

  // ─── Wave primitives ───────────────────────────────────────────────────────

  /** Spread activation through edges. */
  propagate(spreadFactor = 0.1, damping = 0.95): void {
    const deltas = new Map<string, number>();
    for (const [srcId, neighbors] of this.adjacency) {
      const srcNode = this.nodes.get(srcId);
      if (!srcNode || srcNode.collapsed) continue;
      for (const { dst, weight } of neighbors) {
        const delta = srcNode.activation * weight * spreadFactor * damping;
        deltas.set(dst, (deltas.get(dst) ?? 0) + delta);
      }
    }
    for (const [nodeId, delta] of deltas) {
      const node = this.nodes.get(nodeId);
      if (node && !node.collapsed) {
        node.activation = Math.min(1, node.activation + delta);
      }
    }
  }

  /** Decay all activations toward base_strength. */
  relaxAll(relaxDecay = 0.85): void {
    for (const node of this.nodes.values()) {
      if (!node.collapsed) {
        node.activation =
          node.base_strength + (node.activation - node.base_strength) * relaxDecay;
      }
    }
  }

  /** Find nodes where |activation - base_strength| > threshold. */
  detectTension(threshold = 0.2): WaveTensions {
    const tensions: WaveTensions = {};
    for (const node of this.nodes.values()) {
      if (node.collapsed) continue;
      const t = Math.abs(node.activation - node.base_strength);
      if (t > threshold) tensions[node.id] = t;
    }
    return tensions;
  }

  /**
   * Full wave cycle: propagate → relax → detect tension.
   * Mirrors Python run_rules_cycle() at the math level.
   */
  runWaveCycle(
    spread = 0.1,
    damping = 0.95,
    relaxDecay = 0.85,
    tensionThreshold = 0.2,
  ): WaveTensions {
    this.propagate(spread, damping);
    this.relaxAll(relaxDecay);
    this._cycleCount++;
    const tensions = this.detectTension(tensionThreshold);
    // Mark high-tension nodes with last_wave
    for (const id of Object.keys(tensions)) {
      const node = this.nodes.get(id);
      if (node) node.last_wave = this._cycleCount;
    }
    return tensions;
  }

  /**
   * Spawn an emergent child node for the highest-tension node.
   * Returns the new node id, or null if no tension found.
   * TS Logic: mirrors rules_engine.spawn_emergence.
   */
  spawnEmergent(tensionThreshold = 0.35): string | null {
    const tensions = this.detectTension(tensionThreshold);
    const sorted = Object.entries(tensions).sort(([, a], [, b]) => b - a);
    if (sorted.length === 0) return null;

    const [parentId] = sorted[0];
    const childId = `emergent:${parentId}`;
    if (this.nodes.has(childId)) return null;

    const parent = this.nodes.get(parentId)!;
    this.addNode(
      childId,
      `Emergent pattern from ${parentId}`,
      parent.activation * 0.5,
      0.3,
      0.4,
    );
    this.addEdge(parentId, childId, 0.6);
    return childId;
  }

  /** Boost a node's activation directly (simulates "pushing" a node). */
  pushActivation(nodeId: string, amount: number): void {
    const node = this.nodes.get(nodeId);
    if (node) node.activation = Math.min(1, node.activation + Math.max(0, amount));
  }

  /** Return the node with max activation * base_strength. */
  strongestNodeId(): string | null {
    let best: string | null = null;
    let bestScore = -1;
    for (const node of this.nodes.values()) {
      if (node.collapsed) continue;
      const score = node.activation * node.base_strength;
      if (score > bestScore) { bestScore = score; best = node.id; }
    }
    return best;
  }

  /** Get all non-collapsed nodes as an array. */
  getNodes(): WasmNodeState[] {
    return Array.from(this.nodes.values()).filter((n) => !n.collapsed);
  }

  getNode(id: string): WasmNodeState | undefined {
    return this.nodes.get(id);
  }

  get cycleCount(): number { return this._cycleCount; }
  get nodeCount(): number { return this.nodes.size; }
  get edgeCount(): number { return this.edges.length; }
}

// ─── Original 1-D ring helpers (preserved for backward compatibility) ─────────

export function relaxStep(activations: Float32Array, relax: number): Float32Array {
  const r = Math.max(0, Math.min(1, relax));
  const out = new Float32Array(activations.length);
  for (let i = 0; i < activations.length; i++) {
    out[i] = activations[i] * r + 0.5 * (1 - r);
  }
  return out;
}

export function propagateRing(
  activations: Float32Array,
  sourceIdx: number,
  amount: number,
): Float32Array {
  const n = activations.length;
  if (n === 0) return new Float32Array();
  const out = new Float32Array(activations);
  const s = Math.min(Math.max(0, sourceIdx), n - 1);
  const add = Math.max(0, amount) * 0.45;
  const left = (s + n - 1) % n;
  const right = (s + 1) % n;
  out[left] = Math.min(1, out[left] + add);
  out[right] = Math.min(1, out[right] + add);
  out[s] = Math.min(1, out[s] + add * 0.5);
  return out;
}

// ─── Optional WASM loader ─────────────────────────────────────────────────────

/** WASM module type — mirrors the exports from wasm/ts-os-mini/src/lib.rs */
interface WasmModule {
  WaveGraph: {
    new(): {
      add_node(id: string, content: string, activation: number, base_strength: number, stability: number): void;
      add_edge(src: string, dst: string, weight: number): void;
      run_wave_cycle(spread: number, damping: number, relax_decay: number, tension_threshold: number): string;
      activations_json(): string;
      tensions_json(threshold: number): string;
      query(text: string, spread: number, relax_decay: number): string;
      node_count(): number;
      cycle_count(): number;
      spawn_emergent(threshold: number): string;
      free(): void;
    };
  };
  relax_step(activations: Float32Array, relax: number): Float32Array;
  propagate_ring(activations: Float32Array, source_idx: number, amount: number): Float32Array;
}

let _wasmModule: WasmModule | null = null;
let _wasmLoadAttempted = false;

/**
 * Attempt to load the compiled WASM module from /public/wasm/ts-os-mini/.
 * Returns the module if available, null otherwise (TypeScript fallback is used).
 * The Python/Docker stack remains the primary runtime — this is browser-only.
 */
export async function tryLoadWasm(): Promise<WasmModule | null> {
  if (_wasmLoadAttempted) return _wasmModule;
  _wasmLoadAttempted = true;
  try {
    // Dynamic import — only resolves if wasm-pack build has been run
    const mod = await import(
      /* webpackIgnore: true */
      "/wasm/ts-os-mini/ts_os_mini.js"
    );
    if (mod && typeof mod.default === "function") {
      await mod.default(); // init WASM
    }
    _wasmModule = mod as unknown as WasmModule;
    console.info("[Wave 15] Native WASM module loaded — ts-os-mini running in WebAssembly");
  } catch {
    console.info("[Wave 15] WASM not built — using TypeScript fallback (same math)");
    _wasmModule = null;
  }
  return _wasmModule;
}

export function isWasmLoaded(): boolean {
  return _wasmModule !== null;
}
