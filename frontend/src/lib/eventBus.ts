/**
 * Global EventBus — the nervous system of the TS site.
 * Every activation, propagation, and user interaction fires through here,
 * mirroring how the real TS-OS dispatches wave events through the graph.
 */

type EventHandler<T = unknown> = (payload: T) => void;

interface EventMap {
  "wave:tick": { cycle: number; phase: WavePhase };
  "wave:activate": { nodeId: string; activation: number };
  "wave:propagate": { sourceId: string; targetId: string; strength: number };
  "wave:relax": { nodeId: string; newActivation: number };
  "wave:break": { nodeId: string };
  "wave:evolve": { nodeId: string; label: string };
  "nav:hover": { section: string };
  "nav:click": { section: string };
  "node:click": { nodeId: string; x: number; y: number };
  "toast:show": { message: string; type: "success" | "info" | "warning" };
}

type WavePhase =
  | "elect"
  | "propagate"
  | "relax"
  | "prune"
  | "merge"
  | "split"
  | "contradict"
  | "tension"
  | "evolve"
  | "save"
  | "idle";

class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(handler as EventHandler);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const key = event as string;
    const handlers = this.listeners.get(key);
    if (!handlers) return;
    const idx = handlers.indexOf(handler as EventHandler);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const key = event as string;
    const handlers = this.listeners.get(key) ?? [];
    handlers.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${key}":`, err);
      }
    });
  }

  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const unsub = this.on(event, (payload) => {
      handler(payload);
      unsub();
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
export type { WavePhase, EventMap };
