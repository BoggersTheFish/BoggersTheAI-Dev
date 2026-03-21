"use client";

import { useEffect, useRef } from "react";
import { useWaveStore } from "@/store/waveStore";
import { eventBus } from "@/lib/eventBus";

/**
 * Starts the global wave cycle on mount and cleans up on unmount.
 * Must be called once at the root client provider level.
 */
export function useWaveCycle() {
  const startWaveCycle = useWaveStore((s) => s.startWaveCycle);
  const stopWaveCycle = useWaveStore((s) => s.stopWaveCycle);
  const cycle = useWaveStore((s) => s.cycle);
  const phase = useWaveStore((s) => s.wavePhase);
  const tension = useWaveStore((s) => s.tension);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startWaveCycle();
    return () => stopWaveCycle();
  }, [startWaveCycle, stopWaveCycle]);

  return { cycle, phase, tension };
}

/**
 * Subscribe to a specific node's activation changes.
 */
export function useNodeActivation(nodeId: string) {
  const node = useWaveStore((s) => s.nodes[nodeId]);
  const activateNode = useWaveStore((s) => s.activateNode);

  return {
    activation: node?.activation ?? 0,
    stability: node?.stability ?? 0,
    status: node?.status ?? "stable",
    activate: (boost?: number) => activateNode(nodeId, boost),
  };
}

/**
 * Subscribe to the wave event bus for a specific event.
 */
export function useWaveEvent<T>(
  event: Parameters<typeof eventBus.on>[0],
  handler: (payload: T) => void
) {
  useEffect(() => {
    const unsub = eventBus.on(event, handler as Parameters<typeof eventBus.on>[1]);
    return unsub;
  }, [event, handler]);
}
