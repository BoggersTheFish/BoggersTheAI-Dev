//! Wave 15 — TS-OS Mini: full wave-cycle engine compiled to WebAssembly.
//!
//! This crate implements the core TS Logic primitives:
//!   • WaveGraph    — node/edge graph with activation state
//!   • propagate()  — spread activation through topology (topology signal)
//!   • relax_all()  — decay activation toward base_strength (relax_decay)
//!   • detect_tension() — find nodes where |activation - base_strength| > threshold
//!   • run_wave_cycle() — full cycle (propagate + relax + tension), returns JSON
//!   • spawn_emergent() — creates an emergent child node when tension spikes
//!
//! The Python/Docker runtime remains primary; this module adds an optional
//! browser-mode fallback so the Lab page can answer queries without a server.
//!
//! Build: bash scripts/build-wasm.sh
//!   → frontend/public/wasm/ts-os-mini/ (JS + .wasm)
//!
//! The TypeScript mirror in frontend/src/lib/wasmTsOs.ts mirrors every
//! function here for instant load without the WASM build.

use wasm_bindgen::prelude::*;

// ─── Node ────────────────────────────────────────────────────────────────────

struct WasmNode {
    id: String,
    content: String,
    activation: f32,
    base_strength: f32,
    stability: f32,
    last_wave: u32,
    collapsed: bool,
}

// ─── WaveGraph ────────────────────────────────────────────────────────────────

/// Full TS-OS wave graph running in WebAssembly.
///
/// Mirrors the Python UniversalLivingGraph core logic:
///   - add_node / add_edge build the topology
///   - run_wave_cycle executes propagate → relax → tension detection
///   - spawn_emergent creates child nodes when tension crosses threshold
///   - activations_json / tensions_json return JSON strings for the UI
#[wasm_bindgen]
pub struct WaveGraph {
    nodes: Vec<WasmNode>,
    edges: Vec<(usize, usize, f32)>,
    cycle_count: u32,
}

#[wasm_bindgen]
impl WaveGraph {
    /// Create an empty WaveGraph.
    #[wasm_bindgen(constructor)]
    pub fn new() -> WaveGraph {
        WaveGraph {
            nodes: Vec::new(),
            edges: Vec::new(),
            cycle_count: 0,
        }
    }

    /// Add a node. activation and base_strength are clamped to [0, 1].
    pub fn add_node(
        &mut self,
        id: &str,
        content: &str,
        activation: f32,
        base_strength: f32,
        stability: f32,
    ) {
        // Upsert: if id exists update it, otherwise push
        if let Some(existing) = self.nodes.iter_mut().find(|n| n.id == id) {
            existing.activation = activation.clamp(0.0, 1.0);
            existing.base_strength = base_strength.clamp(0.0, 1.0);
            existing.stability = stability.clamp(0.0, 1.0);
            return;
        }
        self.nodes.push(WasmNode {
            id: id.to_string(),
            content: content.to_string(),
            activation: activation.clamp(0.0, 1.0),
            base_strength: base_strength.clamp(0.0, 1.0),
            stability: stability.clamp(0.0, 1.0),
            last_wave: 0,
            collapsed: false,
        });
    }

    /// Add a directed edge (src_id → dst_id, weight clamped to [0, 1]).
    pub fn add_edge(&mut self, src_id: &str, dst_id: &str, weight: f32) {
        let src = self.nodes.iter().position(|n| n.id == src_id);
        let dst = self.nodes.iter().position(|n| n.id == dst_id);
        if let (Some(s), Some(d)) = (src, dst) {
            // Avoid duplicate edges — update weight if already present
            for &mut (ref es, ref ed, ref mut ew) in &mut self.edges {
                if *es == s && *ed == d {
                    *ew = weight.clamp(0.0, 1.0);
                    return;
                }
            }
            self.edges.push((s, d, weight.clamp(0.0, 1.0)));
        }
    }

    // ─── Wave primitives ──────────────────────────────────────────────────────

    /// Spread activation through edges.
    /// delta = src.activation * edge_weight * spread_factor * damping
    pub fn propagate(&mut self, spread_factor: f32, damping: f32) {
        let n = self.nodes.len();
        let mut deltas = vec![0.0f32; n];
        for &(src, dst, weight) in &self.edges {
            if src < n && dst < n && !self.nodes[src].collapsed {
                let delta = self.nodes[src].activation * weight * spread_factor * damping;
                deltas[dst] += delta;
            }
        }
        for (i, node) in self.nodes.iter_mut().enumerate() {
            if !node.collapsed {
                node.activation = (node.activation + deltas[i]).min(1.0);
            }
        }
    }

    /// Decay all activations toward base_strength.
    /// a' = base_strength + (a - base_strength) * relax_decay
    pub fn relax_all(&mut self, relax_decay: f32) {
        let r = relax_decay.clamp(0.0, 1.0);
        for node in &mut self.nodes {
            if !node.collapsed {
                node.activation =
                    node.base_strength + (node.activation - node.base_strength) * r;
            }
        }
    }

    /// Run a full wave cycle: propagate → relax → return tension JSON.
    /// TS Logic: this is the single atomic unit of the wave engine.
    pub fn run_wave_cycle(
        &mut self,
        spread: f32,
        damping: f32,
        relax_decay: f32,
        tension_threshold: f32,
    ) -> String {
        self.propagate(spread, damping);
        self.relax_all(relax_decay);
        self.cycle_count += 1;

        // Update last_wave on active nodes
        let cycle = self.cycle_count;
        for node in &mut self.nodes {
            if !node.collapsed && (node.activation - node.base_strength).abs() > tension_threshold {
                node.last_wave = cycle;
            }
        }

        self.tensions_json(tension_threshold)
    }

    // ─── Emergence ─────────────────────────────────────────────────────────────

    /// Spawn an emergent child node for the highest-tension node.
    /// Returns the new node id, or empty string if no tension found.
    /// TS Logic: mirrors rules_engine.spawn_emergence — tension above threshold
    /// drives new node creation (the graph grows itself).
    pub fn spawn_emergent(&mut self, tension_threshold: f32) -> String {
        let candidate = self.nodes.iter().enumerate()
            .filter(|(_, n)| !n.collapsed)
            .map(|(i, n)| (i, (n.activation - n.base_strength).abs()))
            .filter(|(_, t)| *t > tension_threshold)
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

        if let Some((parent_idx, _)) = candidate {
            let parent_id = self.nodes[parent_idx].id.clone();
            let child_id = format!("emergent:{}", parent_id);

            // Avoid duplicate emergents
            if self.nodes.iter().any(|n| n.id == child_id) {
                return String::new();
            }

            let parent_act = self.nodes[parent_idx].activation;
            self.nodes.push(WasmNode {
                id: child_id.clone(),
                content: format!("Emergent from {}", parent_id),
                activation: parent_act * 0.5,
                base_strength: 0.3,
                stability: 0.4,
                last_wave: self.cycle_count,
                collapsed: false,
            });

            // Edge: parent → emergent child
            let child_idx = self.nodes.len() - 1;
            self.edges.push((parent_idx, child_idx, 0.6));

            return child_id;
        }
        String::new()
    }

    // ─── Queries ───────────────────────────────────────────────────────────────

    /// Boost activation of a specific node (simulates "pushing" a node).
    pub fn push_activation(&mut self, node_id: &str, amount: f32) {
        if let Some(node) = self.nodes.iter_mut().find(|n| n.id == node_id) {
            node.activation = (node.activation + amount.max(0.0)).min(1.0);
        }
    }

    /// Return the id of the strongest node (max activation * base_strength).
    pub fn strongest_node_id(&self) -> String {
        self.nodes.iter()
            .filter(|n| !n.collapsed)
            .max_by(|a, b| {
                let sa = a.activation * a.base_strength;
                let sb = b.activation * b.base_strength;
                sa.partial_cmp(&sb).unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|n| n.id.clone())
            .unwrap_or_default()
    }

    /// Return the content of a node by id.
    pub fn get_content(&self, node_id: &str) -> String {
        self.nodes.iter()
            .find(|n| n.id == node_id)
            .map(|n| n.content.clone())
            .unwrap_or_default()
    }

    // ─── JSON serialisation ────────────────────────────────────────────────────

    /// Return all node states as a JSON array:
    /// [{"id":"...","activation":0.9,"base_strength":0.5,"stability":0.8,"last_wave":3,"collapsed":false},...]
    pub fn activations_json(&self) -> String {
        let items: Vec<String> = self.nodes.iter().map(|n| {
            format!(
                "{{\"id\":\"{}\",\"activation\":{:.4},\"base_strength\":{:.4},\"stability\":{:.4},\"last_wave\":{},\"collapsed\":{}}}",
                escape_json(&n.id),
                n.activation,
                n.base_strength,
                n.stability,
                n.last_wave,
                n.collapsed,
            )
        }).collect();
        format!("[{}]", items.join(","))
    }

    /// Return high-tension nodes as a JSON object: {"node_id": tension_score, ...}
    pub fn tensions_json(&self, threshold: f32) -> String {
        let items: Vec<String> = self.nodes.iter()
            .filter(|n| !n.collapsed)
            .filter_map(|n| {
                let t = (n.activation - n.base_strength).abs();
                if t > threshold {
                    Some(format!("\"{}\":{:.4}", escape_json(&n.id), t))
                } else {
                    None
                }
            })
            .collect();
        format!("{{{}}}", items.join(","))
    }

    /// Return a simple query answer: boost matching nodes, run 3 cycles, return best content.
    /// This is the WASM fallback for the Lab /query endpoint.
    pub fn query(&mut self, text: &str, spread: f32, relax_decay: f32) -> String {
        let words: Vec<String> = text
            .to_lowercase()
            .split(|c: char| !c.is_alphanumeric())
            .filter(|w| w.len() > 3)
            .map(|w| w.to_string())
            .collect();

        // Boost nodes whose id or content contains query words
        let n = self.nodes.len();
        let mut boosts = vec![0.0f32; n];
        for (i, node) in self.nodes.iter().enumerate() {
            for word in &words {
                if node.id.contains(word.as_str()) || node.content.to_lowercase().contains(word.as_str()) {
                    boosts[i] += 0.3;
                }
            }
        }
        for (i, boost) in boosts.iter().enumerate() {
            if *boost > 0.0 {
                self.nodes[i].activation = (self.nodes[i].activation + boost).min(1.0);
            }
        }

        // Run 3 wave cycles to propagate activation
        for _ in 0..3 {
            self.propagate(spread, 0.95);
            self.relax_all(relax_decay);
        }
        self.cycle_count += 3;

        // Return content of the strongest node
        let best_id = self.strongest_node_id();
        if best_id.is_empty() {
            return "The TS-OS graph has no active nodes to answer from.".to_string();
        }
        let content = self.get_content(&best_id);
        format!("[WASM] {}", content)
    }

    // ─── Diagnostics ──────────────────────────────────────────────────────────

    pub fn node_count(&self) -> usize {
        self.nodes.iter().filter(|n| !n.collapsed).count()
    }

    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }

    pub fn cycle_count(&self) -> u32 {
        self.cycle_count
    }
}

// ─── Original 1-D ring helpers (preserved for backward compatibility) ─────────

/// Relax each activation toward 0.5: `a' = a * relax + 0.5 * (1 - relax)`.
#[wasm_bindgen]
pub fn relax_step(activations: &[f32], relax: f32) -> Vec<f32> {
    let r = relax.clamp(0.0, 1.0);
    activations
        .iter()
        .map(|a| a * r + 0.5 * (1.0 - r))
        .collect()
}

/// Push activation at index `source_idx`, spread fraction `amount` to neighbors (ring).
#[wasm_bindgen]
pub fn propagate_ring(activations: &[f32], source_idx: usize, amount: f32) -> Vec<f32> {
    let n = activations.len();
    if n == 0 {
        return vec![];
    }
    let mut out = activations.to_vec();
    let s = source_idx.min(n - 1);
    let add = amount.max(0.0) * 0.45;
    let left = (s + n - 1) % n;
    let right = (s + 1) % n;
    out[left] = (out[left] + add).min(1.0);
    out[right] = (out[right] + add).min(1.0);
    out[s] = (out[s] + add * 0.5).min(1.0);
    out
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn escape_json(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}
