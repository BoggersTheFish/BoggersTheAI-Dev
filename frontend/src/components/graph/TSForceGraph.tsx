"use client";

import dynamic from "next/dynamic";
import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { useWaveStore } from "@/store/waveStore";
import {
  INITIAL_HERO_GRAPH,
  type GraphNode,
  type GraphLink,
} from "./graphData";
import { toast } from "@/components/ui/use-toast";
import { clamp } from "@/lib/utils";

// Dynamic import — no SSR (requires canvas + window)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<Record<string, any>>(
  () => import("react-force-graph-2d").then((m) => m.default ?? m),
  { ssr: false, loading: () => null }
);

interface TSForceGraphProps {
  className?: string;
  interactive?: boolean;
  showLabels?: boolean;
  particleSpeed?: number;
  onNodeClick?: (node: GraphNode) => void;
}

const CLUSTER_COLORS: Record<string, [number, number, number]> = {
  core: [160, 32, 240],
  ai: [180, 60, 255],
  projects: [140, 20, 220],
  meta: [200, 80, 255],
  visitor: [100, 200, 255],
};

export function TSForceGraph({
  className,
  interactive = true,
  showLabels = true,
  particleSpeed = 0.004,
  onNodeClick,
}: TSForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{ zoomToFit: (ms?: number, px?: number) => void; d3Force: (name: string, force?: unknown) => unknown } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [ready, setReady] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const storeNodes = useWaveStore((s) => s.nodes);
  const activateNode = useWaveStore((s) => s.activateNode);
  const cycle = useWaveStore((s) => s.cycle);

  // Merge wave store activations into graph nodes
  const graphData = useMemo(() => {
    const nodes = INITIAL_HERO_GRAPH.nodes.map((n) => ({
      ...n,
      activation: clamp(storeNodes[n.id]?.activation ?? n.activation, 0.1, 1),
    }));
    return { nodes, links: INITIAL_HERO_GRAPH.links };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, storeNodes]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Activate visitor node on load, then zoom to fit
  useEffect(() => {
    if (!ready) return;
    activateNode("visitor", 0.2);
    const t = setTimeout(() => {
      graphRef.current?.zoomToFit(800, 60);
    }, 500);
    return () => clearTimeout(t);
  }, [ready, activateNode]);

  const nodeCanvasObject = useCallback(
    (rawNode: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as GraphNode;
      const { x = 0, y = 0, activation = 0.5, label = "", cluster = "core", isVisitor, isCore } = node;
      const isHovered = hoveredId === node.id;

      const [r, g, b] = CLUSTER_COLORS[cluster] ?? CLUSTER_COLORS.core;
      const baseR = (isCore ? 9 : isVisitor ? 5 : 6) + activation * 5;
      const radius = baseR / globalScale;

      // Outer glow halos
      const haloLayers = isHovered ? 3 : 2;
      for (let i = haloLayers; i >= 1; i--) {
        const haloR = radius * (3 + i * 2);
        const alpha = (activation * (isHovered ? 0.3 : 0.18)) / i;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Core fill
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      coreGrad.addColorStop(0, `rgba(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},255,${activation * 0.95})`);
      coreGrad.addColorStop(0.5, `rgba(${r},${g},${b},${activation * 0.85})`);
      coreGrad.addColorStop(1, `rgba(${Math.max(r - 20, 0)},${Math.max(g - 20, 0)},${Math.max(b - 20, 0)},${activation * 0.7})`);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},255,${activation * (isHovered ? 1 : 0.7)})`;
      ctx.lineWidth = (isHovered ? 2 : 1) / globalScale;
      ctx.stroke();

      // Label
      if (showLabels && (globalScale > 0.5 || isCore)) {
        const fontSize = Math.max(8, (isCore ? 12 : 10) / globalScale);
        ctx.font = `${isCore ? "bold " : ""}${fontSize}px "JetBrains Mono", monospace`;
        const labelAlpha = clamp(activation * 1.3, 0.3, 1);
        ctx.fillStyle = `rgba(${Math.min(r + 80, 255)},${Math.min(g + 100, 255)},255,${labelAlpha})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Label shadow for readability
        ctx.shadowColor = `rgba(0,0,0,0.8)`;
        ctx.shadowBlur = 4 / globalScale;
        ctx.fillText(label, x, y + radius + 3 / globalScale);
        ctx.shadowBlur = 0;
      }

      // Store for hit detection
      node.__bckgDimensions = [radius * 2, radius * 2];
    },
    [hoveredId, showLabels]
  );

  const nodePointerAreaPaint = useCallback(
    (rawNode: object, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as GraphNode;
      const { x = 0, y = 0, activation = 0.5, isCore } = node;
      const baseR = (isCore ? 9 : 6) + activation * 5;
      const radius = (baseR + 8) / globalScale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    []
  );

  const linkCanvasObject = useCallback(
    (rawLink: object, ctx: CanvasRenderingContext2D) => {
      const link = rawLink as GraphLink;
      const src = link.source as GraphNode;
      const tgt = link.target as GraphNode;
      if (!src?.x || !tgt?.x) return;

      const avgActivation = ((src.activation ?? 0.5) + (tgt.activation ?? 0.5)) / 2;
      const alpha = link.strength * avgActivation * 0.45;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y ?? 0);
      ctx.lineTo(tgt.x, tgt.y ?? 0);

      const grad = ctx.createLinearGradient(src.x, src.y ?? 0, tgt.x, tgt.y ?? 0);
      grad.addColorStop(0, `rgba(160,32,240,${alpha * (src.activation ?? 0.5)})`);
      grad.addColorStop(1, `rgba(160,32,240,${alpha * (tgt.activation ?? 0.5)})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = link.strength * avgActivation * 1.5;
      ctx.stroke();
    },
    []
  );

  const handleNodeClick = useCallback(
    (rawNode: object) => {
      const node = rawNode as GraphNode;
      if (!interactive) return;
      activateNode(node.id, 0.35);
      toast({
        title: `↯ ${node.label}`,
        description: `Activation: ${((storeNodes[node.id]?.activation ?? node.activation) * 100).toFixed(0)}% — propagating to ${node.edges?.length ?? 0} nodes`,
        variant: "wave",
      });
      if (onNodeClick) {
        onNodeClick(node);
        return;
      }
      if (node.section && node.section !== "home") {
        const el = document.getElementById(node.section);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [interactive, activateNode, storeNodes, onNodeClick]
  );

  const handleNodeHover = useCallback((rawNode: object | null) => {
    const node = rawNode as GraphNode | null;
    setHoveredId(node?.id ?? null);
    if (typeof document !== "undefined") {
      document.body.style.cursor = node ? "pointer" : "default";
    }
  }, []);

  const handleEngineStop = useCallback(() => {
    setReady(true);
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ background: "transparent" }}>
      {dimensions.width > 0 && (
        <ForceGraph2D
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={graphRef as any}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          linkCanvasObject={linkCanvasObject}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onEngineStop={handleEngineStop}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleColor={() => "rgba(160,32,240,0.8)"}
          linkDirectionalParticleSpeed={particleSpeed}
          d3VelocityDecay={0.45}
          d3AlphaDecay={0.015}
          warmupTicks={80}
          cooldownTicks={300}
          enableZoomInteraction={false}
          enablePanInteraction={false}
          nodeRelSize={1}
        />
      )}
    </div>
  );
}
