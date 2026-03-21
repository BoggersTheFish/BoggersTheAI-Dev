"use client";

import { useCallback, useMemo, useState } from "react";
import { Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { propagateRing, relaxStep } from "@/lib/wasmTsOs";

const N = 7;
const LABELS = ["TS Core", "LLM", "Memory", "Wave", "Self-Improve", "Output", "You"];

export function WasmWaveDemo() {
  const initial = useMemo(
    () => new Float32Array([0.9, 0.6, 0.5, 0.75, 0.4, 0.3, 0.15]),
    []
  );
  const [act, setAct] = useState<Float32Array>(() => new Float32Array(initial));
  const [cycle, setCycle] = useState(0);
  const tick = useCallback(() => {
    setAct((prev) => relaxStep(prev, 0.85));
    setCycle((c) => c + 1);
  }, []);

  const push = useCallback((idx: number) => {
    setAct((prev) => propagateRing(prev, idx, 0.55));
    setCycle((c) => c + 1);
  }, []);

  const reset = useCallback(() => {
    setAct(new Float32Array(initial));
    setCycle(0);
  }, [initial]);

  return (
    <div className="ts-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ts-purple/20 bg-ts-purple/5">
        <div className="flex items-center gap-2 flex-wrap">
          <Zap className="w-3.5 h-3.5 text-ts-purple" />
          <span className="text-xs font-mono text-ts-purple-light">Wave 15 — TS-OS Mini (browser)</span>
          <span className="text-[10px] font-mono text-muted-foreground">cycle #{cycle}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="h-6 px-2 text-xs">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground px-4 pt-3">
        Same numerical core as the Rust crate in{" "}
        <code className="text-ts-purple-light/90">wasm/ts-os-mini</code>. Run{" "}
        <code className="text-ts-purple-light/90">bash scripts/build-wasm.sh</code> to emit{" "}
        <code className="text-ts-purple-light/90">public/wasm/ts-os-mini/</code> for native WebAssembly.
      </p>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          {LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => push(i)}
              className="w-full flex items-center gap-2 text-xs group hover:bg-ts-purple/5 rounded px-2 py-1 transition-colors"
            >
              <span className="text-ts-purple/60 font-mono w-24 text-left truncate">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-ts-purple/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-ts-purple transition-all duration-300"
                  style={{ width: `${act[i] * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10px] w-10 text-right text-muted-foreground">
                {(act[i] * 100).toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-2">
          <Button onClick={tick} className="w-full h-9 text-xs font-mono">
            Relax step (same as WASM relax_step)
          </Button>
          <p className="text-[10px] text-muted-foreground font-mono">
            Pure client execution — no Python runtime in the tab.
          </p>
        </div>
      </div>
    </div>
  );
}
