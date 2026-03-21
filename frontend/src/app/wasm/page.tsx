import Link from "next/link";
import { WasmWaveDemo } from "@/components/wasm/WasmWaveDemo";

export const metadata = {
  title: "WASM — Wave 15 | BoggersTheFish",
  description:
    "Wave 15 WASM Port: full TS-OS wave cycle running in the browser — propagate, relax, tension detection, and emergence. No install required.",
};

export default function WasmPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <section className="pt-28 pb-8 px-4 max-w-3xl mx-auto">
        <p className="text-xs font-mono text-ts-purple mb-2">Wave 15 — WASM Port</p>
        <h1 className="text-3xl font-bold mb-4">TS-OS in the browser</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The full wave-cycle engine — propagate, relax, tension detection, and emergence — running
          100% client-side. No Docker. No install. No server.
        </p>

        {/* Architecture callout */}
        <div className="rounded-lg border border-ts-purple/20 bg-ts-purple/5 p-4 mb-4 space-y-2 text-xs font-mono">
          <div className="text-ts-purple-light font-semibold text-[11px] mb-1">Wave 15 Architecture</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <span className="text-white">Rust WASM crate</span>
              <br />
              <code className="text-ts-purple-light/80">wasm/ts-os-mini</code>
              <br />
              WaveGraph · propagate · relax_all
              <br />
              detect_tension · spawn_emergent · query
            </div>
            <div>
              <span className="text-white">TypeScript mirror</span>
              <br />
              <code className="text-ts-purple-light/80">lib/wasmTsOs.ts</code>
              <br />
              WaveGraphEngine — same math, instant load.
              <br />
              Auto-upgrades to native WASM if built.
            </div>
            <div>
              <span className="text-white">Browser query engine</span>
              <br />
              <code className="text-ts-purple-light/80">lib/wasmQueryEngine.ts</code>
              <br />
              12-node TS-OS knowledge graph.
              <br />
              Fallback when Docker stack is offline.
            </div>
            <div>
              <span className="text-white">Lab WASM fallback</span>
              <br />
              <code className="text-ts-purple-light/80">app/lab/page.tsx</code>
              <br />
              Auto-detects offline backend.
              <br />
              Switches to WASM mode seamlessly.
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          The Python/Docker runtime remains primary. To enable native WebAssembly execution:
          {" "}<code className="text-ts-purple-light">bash scripts/build-wasm.sh</code>
          {" "}(requires Rust + wasm-pack). Until then, the TypeScript mirror handles everything
          with identical math.
        </p>

        <div className="flex gap-3 flex-wrap">
          <Link href="/lab" className="text-ts-purple-light text-xs underline">
            ← Lab (try WASM fallback)
          </Link>
          <Link
            href="https://github.com/BoggersTheFish/BoggersTheAI-Dev/tree/main/wasm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ts-purple-light text-xs underline"
          >
            Rust source →
          </Link>
        </div>
      </section>

      {/* Live demo */}
      <section className="px-4 pb-20 max-w-3xl mx-auto">
        <WasmWaveDemo />
      </section>
    </div>
  );
}
