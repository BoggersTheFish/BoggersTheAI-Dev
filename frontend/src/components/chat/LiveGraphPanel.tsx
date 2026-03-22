"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Network, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { boggersUrl, getSessionHeaders } from "@/lib/boggersApi";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<Record<string, any>>(
  () => import("react-force-graph-2d").then((m) => m.default ?? m),
  { ssr: false, loading: () => null }
);

type ApiNode = {
  id: string;
  topics: string[];
  activation: number;
  stability: number;
  kind?: string;
  content_preview?: string;
};

type ApiEdge = { src: string; dst: string; weight: number };

type GraphMeta = {
  total_nodes: number;
  total_edges: number;
  shown_nodes: number;
  shown_edges: number;
  cycle_count: number;
  tension: number;
  thread_alive: boolean;
};

const KIND_COLORS: Record<string, [number, number, number]> = {
  probe: [249, 115, 22],
  conversation: [168, 85, 247],
  query: [34, 211, 238],
  session: [74, 222, 128],
  runtime: [100, 116, 139],
  multimodal: [251, 113, 133],
  concept: [139, 92, 246],
};

function shortLabel(n: ApiNode): string {
  const prev = n.content_preview?.trim();
  if (prev && prev.length > 0) {
    return prev.length > 36 ? `${prev.slice(0, 34)}…` : prev;
  }
  if (n.topics?.length) return n.topics.slice(0, 2).join(" · ");
  if (n.id.length > 22) return `${n.id.slice(0, 20)}…`;
  return n.id;
}

interface LiveGraphPanelProps {
  /** Increment after each successful chat query to pull fresh graph state. */
  refreshSignal?: number;
  className?: string;
}

export function LiveGraphPanel({ refreshSignal = 0, className }: LiveGraphPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{
    zoomToFit: (ms?: number, pad?: number) => void;
  } | null>(null);
  const [dims, setDims] = useState({ w: 400, h: 320 });
  const [data, setData] = useState<{
    nodes: ApiNode[];
    edges: ApiEdge[];
    meta: GraphMeta | null;
  }>({ nodes: [], edges: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const load = useCallback(async () => {
    try {
      const base = boggersUrl("/graph");
      const sep = base.includes("?") ? "&" : "?";
      const r = await fetch(
        `${base}${sep}max_nodes=380&content_preview=120`,
        {
        headers: { ...getSessionHeaders() },
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!r.ok) {
        setErr(r.status === 401 ? "Unauthorized — check BOGGERS_DASHBOARD_TOKEN" : `HTTP ${r.status}`);
        setLoading(false);
        return;
      }
      const j = (await r.json()) as {
        nodes: ApiNode[];
        edges: ApiEdge[];
        meta?: GraphMeta;
      };
      setData({
        nodes: j.nodes ?? [],
        edges: j.edges ?? [],
        meta: j.meta ?? null,
      });
      setErr("");
      setLastFetch(Date.now());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Graph fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  useEffect(() => {
    const t = setInterval(load, 2800);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => graphRef.current?.zoomToFit?.(400, 24), 600);
    return () => clearTimeout(t);
  }, [data.nodes.length, dims.w]);

  const fgData = useMemo(() => {
    const nodes = data.nodes.map((n) => ({
      id: n.id,
      label: shortLabel(n),
      kind: n.kind || "concept",
      activation: n.activation,
      raw: n,
    }));
    const links = data.edges.map((e) => ({
      source: e.src,
      target: e.dst,
      weight: e.weight,
    }));
    return { nodes, links };
  }, [data.nodes, data.edges]);

  const nodeCanvasObject = useCallback(
    (node: { x?: number; y?: number; id?: string; label?: string; kind?: string; activation?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const kind = (node.kind as string) || "concept";
      const act = typeof node.activation === "number" ? node.activation : 0.5;
      const [r, g, b] = KIND_COLORS[kind] ?? KIND_COLORS.concept;
      const isHover = hoverId === node.id;
      const radius = (4 + act * 10) / globalScale;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
      grad.addColorStop(0, `rgba(${r},${g},${b},${0.15 + act * 0.35})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.75 + act * 0.2})`;
      ctx.fill();
      ctx.strokeStyle = isHover ? "rgba(255,255,255,0.9)" : `rgba(${r + 40},${g + 40},255,0.5)`;
      ctx.lineWidth = (isHover ? 2 : 1) / globalScale;
      ctx.stroke();

      const fontSize = Math.max(7, 9 / globalScale);
      ctx.font = `${fontSize}px ui-monospace, monospace`;
      ctx.fillStyle = `rgba(220,220,240,${0.65 + act * 0.3})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const text = String(node.label ?? "").slice(0, 42);
      ctx.fillText(text, x, y + radius + 2 / globalScale);
    },
    [hoverId]
  );

  const m = data.meta;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-ts-purple/25 bg-black/50 overflow-hidden min-h-[280px]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-ts-purple/20 bg-ts-purple/5">
        <div className="flex items-center gap-2 min-w-0">
          <Network className="w-4 h-4 text-ts-purple-light flex-shrink-0" />
          <span className="text-xs font-semibold text-white truncate">Living graph</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setLoading(true); load(); }} title="Refresh">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {m && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-1.5 text-[10px] font-mono text-muted-foreground border-b border-ts-purple/10">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-green-400" />
            cycle #{m.cycle_count}
          </span>
          <span>tension {(m.tension * 100).toFixed(1)}%</span>
          <span>
            nodes {m.shown_nodes}/{m.total_nodes}
          </span>
          <span>edges {m.shown_edges}</span>
        </div>
      )}

      <div className="px-2 py-1 text-[9px] text-muted-foreground/80 font-mono border-b border-ts-purple/10">
        <span className="text-orange-400">probe</span>
        {" · "}
        <span className="text-purple-400">chat</span>
        {" · "}
        <span className="text-cyan-400">query</span>
        {" · "}
        <span className="text-violet-400">concept</span>
        {" — wave propagates activation; larger = hotter."}
      </div>

      {err && (
        <div className="px-3 py-2 text-[11px] text-amber-400/90">{err}</div>
      )}

      <div ref={containerRef} className="relative flex-1 w-full min-h-[220px]">
        {fgData.nodes.length === 0 && !loading && !err && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
            No graph nodes yet. Send a message — the system will decompose, probe, and light up the graph.
          </div>
        )}
        {dims.w > 50 && dims.h > 50 && fgData.nodes.length > 0 && (
          <ForceGraph2D
            ref={graphRef}
            width={dims.w}
            height={dims.h}
            graphData={fgData}
            backgroundColor="rgba(0,0,0,0)"
            linkColor={() => "rgba(160,32,240,0.35)"}
            linkWidth={(l: { weight?: number }) => Math.max(0.3, (l.weight ?? 0.2) * 2)}
            nodeLabel={(n: { id: string; label?: string }) => n.id}
            nodeCanvasObject={nodeCanvasObject}
            onNodeHover={(n: { id?: string } | null) => setHoverId(n?.id ?? null)}
            cooldownTicks={80}
            d3VelocityDecay={0.22}
          />
        )}
      </div>

      {lastFetch && (
        <div className="px-2 py-1 text-[9px] text-muted-foreground/60 text-right">
          sync {new Date(lastFetch).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
