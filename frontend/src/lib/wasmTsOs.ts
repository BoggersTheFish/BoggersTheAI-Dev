/**
 * Wave 15 — in-browser TS-OS mini math (mirrors wasm/ts-os-mini Rust crate).
 * After `bash scripts/build-wasm.sh`, you may optionally load the WASM build from /public/wasm/ts-os-mini/.
 */
export function relaxStep(activations: Float32Array, relax: number): Float32Array {
  const r = Math.max(0, Math.min(1, relax));
  const out = new Float32Array(activations.length);
  for (let i = 0; i < activations.length; i++) {
    out[i] = activations[i] * r + 0.5 * (1 - r);
  }
  return out;
}

export function propagateRing(activations: Float32Array, sourceIdx: number, amount: number): Float32Array {
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
