import Link from "next/link";
import { WasmWaveDemo } from "@/components/wasm/WasmWaveDemo";

export const metadata = {
  title: "WASM — Wave 15 | BoggersTheFish",
  description:
    "Wave 15 WASM Port: TS-OS mini runs in the browser with no install. WebAssembly build optional via wasm/ts-os-mini.",
};

export default function WasmPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="pt-28 pb-8 px-4 max-w-3xl mx-auto">
        <p className="text-xs font-mono text-ts-purple mb-2">Wave 15 — WASM Port</p>
        <h1 className="text-3xl font-bold mb-4">TS-OS in the browser</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Official roadmap: WebAssembly version — TS-OS in the browser, no install. This page runs the{" "}
          <strong>TS-OS Mini</strong> propagate/relax loop client-side. The Rust crate{" "}
          <code className="text-ts-purple-light">wasm/ts-os-mini</code> compiles to WebAssembly via{" "}
          <code className="text-ts-purple-light">wasm-pack</code>; the TypeScript below matches its behavior
          until you build WASM into <code className="text-ts-purple-light">public/wasm/ts-os-mini/</code>.
        </p>
        <Link href="/lab" className="text-ts-purple-light text-sm underline">
          ← Back to Lab
        </Link>
      </section>
      <section className="px-4 pb-20 max-w-3xl mx-auto">
        <WasmWaveDemo />
      </section>
    </div>
  );
}
