# Wave 15 — WASM Port

Official roadmap: **WebAssembly version — TS-OS in the browser, no install.**

## Rust crate

- [`wasm/ts-os-mini`](../wasm/ts-os-mini) — `relax_step` and `propagate_ring` compiled with `wasm-bindgen`
- Build: `bash scripts/build-wasm.sh` (requires [Rust](https://rustup.rs) + [wasm-pack](https://rustwasm.wasm-pack.dev/))
- Output: `frontend/public/wasm/ts-os-mini/` (gitignored optional; CI may emit artifacts)

## Next.js UI

- [`frontend/src/app/wasm/page.tsx`](../frontend/src/app/wasm/page.tsx) — public `/wasm` route
- [`frontend/src/lib/wasmTsOs.ts`](../frontend/src/lib/wasmTsOs.ts) — TypeScript mirror of the Rust math for instant load without a WASM build

## Testing

- `cd wasm/ts-os-mini && wasm-pack test --chrome --headless` (see root `Makefile` `test-wasm`)
