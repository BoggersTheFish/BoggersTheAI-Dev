"use client";

import dynamic from "next/dynamic";
import { useRef, useCallback, useEffect, useState } from "react";
import {
  NETWORK_GRAPH_DATA,
  type NetworkNode,
  type NetworkLink,
} from "./graphData";
import { toast } from "@/components/ui/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<Record<string, any>>(
  () => import("react-force-graph-2d").then((m) => m.default ?? m),
  { ssr: false, loading: () => null }
);

const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  github: [160, 32, 240],
  social: [100, 160, 255],
  content: [255, 100, 100],
  misc: [160, 200, 100],
};

export function NetworkGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{ zoomToFit: (ms?: number, px?: number) => void } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => graphRef.current?.zoomToFit(600, 40), 400);
    return () => clearTimeout(t);
  }, []);

  const nodeCanvasObject = useCallback(
    (rawNode: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as NetworkNode;
      const { x = 0, y = 0, activation = 0.6, label = "", category = "misc", id } = node;
      const isHovered = hoveredId === id;
      const isCenter = id === "me";

      const [r, g, b] = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.misc;
      const baseR = (isCenter ? 10 : 5) + activation * 4;
      const radius = baseR / globalScale;

      // Glow
      const haloR = radius * (isHovered ? 8 : 5);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      grad.addColorStop(0, `rgba(${r},${g},${b},${activation * (isHovered ? 0.4 : 0.2)})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      coreGrad.addColorStop(0, `rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},255,${activation * 0.95})`);
      coreGrad.addColorStop(1, `rgba(${r},${g},${b},${activation * 0.7})`);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${Math.min(r + 100, 255)},${Math.min(g + 100, 255)},255,${isHovered ? 1 : activation * 0.7})`;
      ctx.lineWidth = (isHovered ? 2 : 1) / globalScale;
      ctx.stroke();

      // Label
      const fontSize = Math.max(8, (isCenter ? 11 : 9) / globalScale);
      ctx.font = `${isCenter ? "bold " : ""}${fontSize}px "JetBrains Mono", monospace`;
      const labelAlpha = Math.min(activation * 1.5, 1);
      ctx.fillStyle = `rgba(${Math.min(r + 100, 255)},${Math.min(g + 100, 255)},255,${labelAlpha})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 3 / globalScale;
      ctx.fillText(label, x, y + radius + 2 / globalScale);
      ctx.shadowBlur = 0;

      node.__bckgDimensions = [radius * 2, radius * 2];
    },
    [hoveredId]
  );

  const nodePointerAreaPaint = useCallback(
    (rawNode: object, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as NetworkNode;
      const { x = 0, y = 0, activation = 0.6, id } = node;
      const isCenter = id === "me";
      const radius = ((isCenter ? 10 : 5) + activation * 4 + 8) / globalScale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    []
  );

  const handleNodeClick = useCallback((rawNode: object) => {
    const node = rawNode as NetworkNode;
    if (node.id === "me") return;
    toast({
      title: `Opening: ${node.label}`,
      description: node.url.startsWith("mailto") ? node.url : node.url,
      variant: "wave",
    });
    window.open(node.url, "_blank", "noopener,noreferrer");
  }, []);

  const handleNodeHover = useCallback((rawNode: object | null) => {
    const node = rawNode as NetworkNode | null;
    setHoveredId(node?.id ?? null);
    if (typeof document !== "undefined") {
      document.body.style.cursor = (node && node.id !== "me") ? "pointer" : "default";
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: 400 }}>
      {dimensions.width > 0 && (
        <ForceGraph2D
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={graphRef as any}
          graphData={NETWORK_GRAPH_DATA}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkColor={() => "rgba(160,32,240,0.2)"}
          linkWidth={(link) => (link as NetworkLink).strength * 1.5}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1}
          linkDirectionalParticleColor={() => "rgba(160,32,240,0.7)"}
          linkDirectionalParticleSpeed={0.005}
          d3VelocityDecay={0.4}
          d3AlphaDecay={0.015}
          warmupTicks={60}
          cooldownTicks={200}
          enableZoomInteraction={false}
          enablePanInteraction={false}
        />
      )}
    </div>
  );
}
