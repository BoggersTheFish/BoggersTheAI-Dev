# Wave 15 — WASM Port

Official roadmap: **WebAssembly version — TS-OS in the browser, no install.**

## What was built

### 1. Rust WASM crate — full WaveGraph
**File:** [`wasm/ts-os-mini/src/lib.rs`](../wasm/ts-os-mini/src/lib.rs)

`WaveGraph` struct with wasm-bindgen exports:
- `add_node(id, content, activation, base_strength, stability)` — upsert
- `add_edge(src, dst, weight)` — directed edge
- `propagate(spread_factor, damping)` — topo activation spread
- `relax_all(relax_decay)` — decay toward base_strength
- `run_wave_cycle(spread, damping, relax_decay, threshold)` → tensions JSON
- `spawn_emergent(threshold)` → emergent child node id
- `query(text, spread, relax_decay)` → wave-cycle answer (Lab fallback)
- `activations_json()` / `tensions_json()` / `strongest_node_id()`

Original `relax_step` and `propagate_ring` preserved for backward compatibility.

### 2. TypeScript WaveGraphEngine — same math, instant load
**File:** [`frontend/src/lib/wasmTsOs.ts`](../frontend/src/lib/wasmTsOs.ts)

`WaveGraphEngine` class mirrors every Rust function exactly:
- `addNode / addEdge / propagate / relaxAll / detectTension`
- `runWaveCycle` → full cycle, returns `WaveTensions`
- `spawnEmergent` → emergence on high-tension node
- `pushActivation / strongestNodeId / getNodes`

`tryLoadWasm()` — dynamically imports compiled WASM if available, falls back silently to TS.

### 3. WasmQueryEngine — browser query fallback
**File:** [`frontend/src/lib/wasmQueryEngine.ts`](../frontend/src/lib/wasmQueryEngine.ts)

Pre-seeded 12-node knowledge graph covering TS-OS concepts. `query(text)`:
1. Reset graph to seed activations
2. Tokenize → boost matching nodes
3. Run 4 wave cycles
4. Return content of strongest-activation node

Used by Lab page when Docker backend is offline.

### 4. Enhanced WasmWaveDemo
**File:** [`frontend/src/components/wasm/WasmWaveDemo.tsx`](../frontend/src/components/wasm/WasmWaveDemo.tsx)

- 10-node TS-OS concept graph with real topology
- Full wave cycle button (propagate → relax → tension → possibly emergence)
- Tension visualization: nodes glow orange/red when |act − base| > 0.2
- Emergence fires when max tension > 0.38 (spawns emergent child node)
- Click any node to push activation (+0.4)
- WASM / TypeScript runtime badge
- Cycle event log

### 5. Lab page WASM fallback
**File:** [`frontend/src/app/lab/page.tsx`](../frontend/src/app/lab/page.tsx)

`PushNodeForm` auto-detects backend offline (fetch timeout/error) and:
- Switches to WASM mode (orange banner)
- Routes queries to `WasmQueryEngine.query()`
- Shows which node answered and how many wave cycles ran
- Stays in WASM mode for the session

## Build

```bash
# Requires Rust + wasm-pack
bash scripts/build-wasm.sh
# → frontend/public/wasm/ts-os-mini/ (JS + .wasm)
```

Until built, the TypeScript fallback handles everything with identical math.

## Testing (mental — no CPU needed)

1. `docker compose up -d --build` → visit `/wasm` → run wave cycles, push nodes, watch emergence
2. Stop the backend → visit `/lab` → type a query → observe auto-switch to WASM mode
3. `/wasm` shows "WebAssembly" badge after `build-wasm.sh`; "TypeScript" badge otherwise

## TS Logic

- WaveGraph implements the same propagate/relax/tension math as Python `universal_living_graph.py`
- `spawn_emergent()` mirrors `rules_engine.spawn_emergence()` — child nodes inherit parent activation * 0.5
- `query()` runs the wave cycle as the reasoning engine — activation = relevance
- Python/Docker remains primary; WASM is the graceful offline fallback
