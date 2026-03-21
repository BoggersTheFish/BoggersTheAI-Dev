//! Wave 15 — WASM: propagate + relax one step on a 1-D activation vector (TS-OS mini).
use wasm_bindgen::prelude::*;

/// Relax each activation toward 0.5: `a' = a * relax + 0.5 * (1 - relax)`.
#[wasm_bindgen]
pub fn relax_step(activations: &[f32], relax: f32) -> Vec<f32> {
    let r = relax.clamp(0.0, 1.0);
    activations
        .iter()
        .map(|a| a * r + 0.5 * (1.0 - r))
        .collect()
}

/// Push activation at index `source_idx`, spread fraction `amount` to all neighbors (ring).
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
