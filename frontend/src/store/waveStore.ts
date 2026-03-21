"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { clamp, lerp } from "@/lib/utils";
import { eventBus, type WavePhase } from "@/lib/eventBus";

export type NodeStatus = "stable" | "active" | "propagating" | "low-stability";

export interface TSNode {
  id: string;
  label: string;
  activation: number;
  stability: number;
  baseStrength: number;
  edges: string[];
  status: NodeStatus;
  section?: string;
  x?: number;
  y?: number;
}

interface WaveStore {
  cycle: number;
  nodes: Record<string, TSNode>;
  activeNodeId: string | null;
  lastWaveTick: number;
  isRunning: boolean;
  tension: number;
  wavePhase: WavePhase;
  intervalId: ReturnType<typeof setInterval> | null;

  activateNode: (id: string, boost?: number) => void;
  propagateWave: (sourceId: string) => void;
  relaxAll: () => void;
  tick: () => void;
  startWaveCycle: () => void;
  stopWaveCycle: () => void;
  setPhase: (phase: WavePhase) => void;
}

const INITIAL_NODES: Record<string, TSNode> = {
  "ts-core": {
    id: "ts-core",
    label: "TS Core",
    activation: 0.9,
    stability: 0.95,
    baseStrength: 0.8,
    edges: ["boggerstheai", "goat-ts", "wave-cycle"],
    status: "active",
    section: "ts-os",
  },
  "boggerstheai": {
    id: "boggerstheai",
    label: "BoggersTheAI v0.5",
    activation: 0.85,
    stability: 0.92,
    baseStrength: 0.75,
    edges: ["ts-core", "self-improve", "multimodal", "dashboard"],
    status: "active",
    section: "projects",
  },
  "goat-ts": {
    id: "goat-ts",
    label: "GOAT-TS",
    activation: 0.7,
    stability: 0.85,
    baseStrength: 0.7,
    edges: ["ts-core", "ts-philosophy"],
    status: "stable",
    section: "projects",
  },
  "wave-cycle": {
    id: "wave-cycle",
    label: "Wave Cycle",
    activation: 0.75,
    stability: 0.88,
    baseStrength: 0.7,
    edges: ["ts-core", "self-improve", "visitor"],
    status: "propagating",
    section: "ts-os",
  },
  "self-improve": {
    id: "self-improve",
    label: "Self-Improvement Loop",
    activation: 0.65,
    stability: 0.8,
    baseStrength: 0.65,
    edges: ["boggerstheai", "wave-cycle"],
    status: "stable",
    section: "ts-os",
  },
  "multimodal": {
    id: "multimodal",
    label: "Multimodal Stack",
    activation: 0.6,
    stability: 0.75,
    baseStrength: 0.6,
    edges: ["boggerstheai"],
    status: "stable",
    section: "ts-os",
  },
  "dashboard": {
    id: "dashboard",
    label: "FastAPI Dashboard",
    activation: 0.55,
    stability: 0.78,
    baseStrength: 0.55,
    edges: ["boggerstheai"],
    status: "stable",
    section: "lab",
  },
  "ts-philosophy": {
    id: "ts-philosophy",
    label: "TS Philosophy",
    activation: 0.8,
    stability: 0.98,
    baseStrength: 0.9,
    edges: ["goat-ts", "ts-core"],
    status: "stable",
    section: "home",
  },
  "visitor": {
    id: "visitor",
    label: "You (Visitor)",
    activation: 0.3,
    stability: 0.4,
    baseStrength: 0.2,
    edges: ["wave-cycle", "ts-philosophy"],
    status: "low-stability",
    section: "home",
  },
  "wave-12": {
    id: "wave-12",
    label: "Wave 12 — Pages Island",
    activation: 0.95,
    stability: 0.9,
    baseStrength: 0.8,
    edges: ["boggerstheai", "ts-core"],
    status: "active",
    section: "waves",
  },
};

function findStrongestNode(nodes: Record<string, TSNode>): string {
  let best = "";
  let bestScore = -1;
  for (const node of Object.values(nodes)) {
    const score = node.activation * node.stability;
    if (score > bestScore) {
      bestScore = score;
      best = node.id;
    }
  }
  return best;
}

function computeTension(nodes: Record<string, TSNode>): number {
  const activations = Object.values(nodes).map((n) => n.activation);
  const mean = activations.reduce((s, a) => s + a, 0) / activations.length;
  const variance =
    activations.reduce((s, a) => s + (a - mean) ** 2, 0) / activations.length;
  return clamp(variance * 4, 0, 1);
}

export const useWaveStore = create<WaveStore>()(
  subscribeWithSelector((set, get) => ({
    cycle: 0,
    nodes: INITIAL_NODES,
    activeNodeId: "ts-core",
    lastWaveTick: Date.now(),
    isRunning: false,
    tension: 0.2,
    wavePhase: "idle",
    intervalId: null,

    setPhase: (phase) => set({ wavePhase: phase }),

    activateNode: (id, boost = 0.3) => {
      const { nodes } = get();
      if (!nodes[id]) return;
      const updated = {
        ...nodes,
        [id]: {
          ...nodes[id],
          activation: clamp(nodes[id].activation + boost, 0, 1),
          status: "active" as NodeStatus,
        },
      };
      set({ nodes: updated, activeNodeId: id });
      eventBus.emit("wave:activate", { nodeId: id, activation: updated[id].activation });
      get().propagateWave(id);
    },

    propagateWave: (sourceId) => {
      const { nodes } = get();
      const source = nodes[sourceId];
      if (!source) return;

      const updated = { ...nodes };
      const decayFactor = 0.6;

      source.edges.forEach((targetId) => {
        if (!updated[targetId]) return;
        const transfer = source.activation * decayFactor * source.stability;
        updated[targetId] = {
          ...updated[targetId],
          activation: clamp(updated[targetId].activation + transfer * 0.4, 0, 1),
          status: "propagating" as NodeStatus,
        };
        eventBus.emit("wave:propagate", {
          sourceId,
          targetId,
          strength: transfer,
        });
      });

      set({ nodes: updated });
    },

    relaxAll: () => {
      const { nodes } = get();
      const relaxRate = 0.05;
      const updated: Record<string, TSNode> = {};

      for (const [id, node] of Object.entries(nodes)) {
        const newActivation = lerp(node.activation, node.baseStrength, relaxRate);
        const status: NodeStatus =
          newActivation > 0.8
            ? "active"
            : newActivation > 0.5
            ? "propagating"
            : newActivation < 0.3
            ? "low-stability"
            : "stable";
        updated[id] = { ...node, activation: clamp(newActivation, 0, 1), status };
        eventBus.emit("wave:relax", { nodeId: id, newActivation });
      }

      set({ nodes: updated });
    },

    tick: () => {
      const { nodes, cycle } = get();

      // Step 1: Elect
      set({ wavePhase: "elect" });
      const strongestId = findStrongestNode(nodes);

      // Step 2: Propagate
      set({ wavePhase: "propagate" });
      get().propagateWave(strongestId);

      // Step 3: Relax
      set({ wavePhase: "relax" });
      get().relaxAll();

      // Step 8: Tension check
      set({ wavePhase: "tension" });
      const tension = computeTension(get().nodes);

      set({
        cycle: cycle + 1,
        lastWaveTick: Date.now(),
        tension,
        activeNodeId: strongestId,
        wavePhase: "idle",
      });

      eventBus.emit("wave:tick", {
        cycle: cycle + 1,
        phase: "idle",
      });
    },

    startWaveCycle: () => {
      const { isRunning } = get();
      if (isRunning) return;

      const id = setInterval(() => {
        get().tick();
      }, 30_000);

      set({ isRunning: true, intervalId: id });
      get().tick();
    },

    stopWaveCycle: () => {
      const { intervalId } = get();
      if (intervalId) clearInterval(intervalId);
      set({ isRunning: false, intervalId: null, wavePhase: "idle" });
    },
  }))
);
