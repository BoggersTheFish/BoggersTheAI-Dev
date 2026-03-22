"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Network, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { boggersUrl, getBoggersHeaders, getTenantIdForQuery } from "@/lib/boggersApi";
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
  highlight?: boolean;
  ts_heat?: number;
};

type ApiEdge = { src: string; dst: string; weight: number; relation?: string };

type GraphMeta = {
  total_nodes: number;
  total_edges: number;
  shown_nodes: number;
  shown_edges: number;
  cycle_count: number;
  tension: number;
  thread_alive: boolean;
  session_filter?: boolean;
  session_matched?: boolean;
  session_strict?: boolean;
  session_expand?: number;
  highlight_nodes?: number;
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

function graphQueryString(sessionId: string, highlight: boolean): string {
  const p = new URLSearchParams();
  p.set("max_nodes", "380");
  p.set("content_preview", "120");
  p.set("highlight", highlight ? "1" : "0");
  if (sessionId) {
    p.set("session_id", sessionId);
    p.set("session_expand", "1");
    p.set("session_strict", "0");
  }
  const tid = getTenantIdForQuery();
  if (tid) {
    p.set("tenant_id", tid);
  }
  return p.toString();
}

interface LiveGraphPanelProps {
  /** Increment after each successful chat query to pull fresh graph state. */
  refreshSignal?: number;
  /** Browser chat session — scopes graph + last-query highlights (TS-OS). */
  sessionId?: string;
  className?: string;
}

export function LiveGraphPanel({
  refreshSignal = 0,
  sessionId = "",
  className,
}: LiveGraphPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{
    zoomToFit: (ms?: number, pad?: number) => void;
  } | null>(null);
  const prevTensionRef = useRef<number | null>(null);
  const [dims, setDims] = useState({ w: 400, h: 320 });
  const [data, setData] = useState<{
    nodes: ApiNode[];
    edges: ApiEdge[];
    meta: GraphMeta | null;
  }>({ nodes: [], edges: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [linkHover, setLinkHover] = useState<ApiEdge | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [sseOk, setSseOk] = useState(false);
  const [emergenceNote, setEmergenceNote] = useState("");

  const qs = useMemo(
    () => graphQueryString(sessionId, true),
    [sessionId]
  );

  useEffect(() => {
    prevTensionRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyPayload = useCallback(
    (j: { nodes?: ApiNode[]; edges?: ApiEdge[]; meta?: GraphMeta }) => {
      const meta = j.meta ?? null;
      if (meta) {
        const prev = prevTensionRef.current;
        const t = meta.tension;
        if (prev !== null && t - prev > 0.06) {
          setEmergenceNote(`Wave tension rose +${((t - prev) * 100).toFixed(1)}%`);
          window.setTimeout(() => setEmergenceNote(""), 3200);
        }
        prevTensionRef.current = t;
      }
      setData({
        nodes: j.nodes ?? [],
        edges: j.edges ?? [],
        meta,
      });
      setErr("");
      setLastFetch(Date.now());
    },
    []
  );

  const load = useCallback(async () => {
    try {
      const base = boggersUrl("/graph");
      const sep = base.includes("?") ? "&" : "?";
      const r = await fetch(`${base}${sep}${qs}`, {
        headers: { ...getBoggersHeaders() },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        setErr(
          r.status === 401
            ? "Unauthorized — check BOGGERS_DASHBOARD_TOKEN"
            : `HTTP ${r.status}`
        );
        setLoading(false);
        return;
      }
      const j = (await r.json()) as {
        nodes: ApiNode[];
        edges: ApiEdge[];
        meta?: GraphMeta;
      };
      applyPayload(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Graph fetch failed");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, qs]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      load();
    }
  }, [load]);

  useEffect(() => {
    if (refreshSignal > 0) load();
  }, [load, refreshSignal]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      const id = window.setInterval(load, 2800);
      return () => window.clearInterval(id);
    }

    const url = `${boggersUrl("/graph/stream")}?${qs}`;
    const es = new EventSource(url);
    setSseOk(true);
    let poll: ReturnType<typeof setInterval> | undefined;

    es.onmessage = (ev) => {
      try {
        const j = JSON.parse(ev.data) as {
          nodes: ApiNode[];
          edges: ApiEdge[];
          meta?: GraphMeta;
        };
        applyPayload(j);
        setLoading(false);
      } catch {
        /* ignore partial */
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setSseOk(false);
        if (!poll) poll = setInterval(load, 3000);
      }
    };

    return () => {
      es.close();
      if (poll) clearInterval(poll);
    };
  }, [applyPayload, load, qs]);

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
      ts_heat: typeof n.ts_heat === "number" ? n.ts_heat : 0,
      highlight: !!n.highlight,
      raw: n,
    }));
    const links = data.edges.map((e) => ({
      source: e.src,
      target: e.dst,
      weight: e.weight,
      relation: e.relation ?? "relates",
    }));
    return { nodes, links };
  }, [data.nodes, data.edges]);

  const nodeCanvasObject = useCallback(
    (
      node: {
        x?: number;
        y?: number;
        id?: string;
        label?: string;
        kind?: string;
        activation?: number;
        ts_heat?: number;
        highlight?: boolean;
      },
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const kind = (node.kind as string) || "concept";
      const act = typeof node.activation === "number" ? node.activation : 0.5;
      const heat = typeof node.ts_heat === "number" ? node.ts_heat : 0;
      const [r, g, b] = KIND_COLORS[kind] ?? KIND_COLORS.concept;
      const isHover = hoverId === node.id;
      const hl = !!node.highlight;
      const radius = (4 + act * 10) / globalScale;

      if (heat > 0.35) {
        const hr = radius * (2.2 + heat * 2);
        const hgrad = ctx.createRadialGradient(x, y, 0, x, y, hr);
        hgrad.addColorStop(0, `rgba(251, 191, 36, ${0.12 + heat * 0.2})`);
        hgrad.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.beginPath();
        ctx.arc(x, y, hr, 0, Math.PI * 2);
        ctx.fillStyle = hgrad;
        ctx.fill();
      }

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
      ctx.strokeStyle = hl
        ? "rgba(250, 250, 255, 0.95)"
        : isHover
          ? "rgba(255,255,255,0.9)"
          : `rgba(${r + 40},${g + 40},255,0.5)`;
      ctx.lineWidth = (hl ? 2.4 : isHover ? 2 : 1) / globalScale;
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
          {sseOk && (
            <span className="text-[9px] font-mono text-green-400/90 uppercase tracking-wide">
              sse
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => {
            setLoading(true);
            load();
          }}
          title="Refresh"
        >
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
          {typeof m.highlight_nodes === "number" && m.highlight_nodes > 0 && (
            <span className="text-white/80">ctx {m.highlight_nodes}</span>
          )}
          {m.session_filter && (
            <span
              className={
                m.session_strict && m.shown_nodes === 0
                  ? "text-rose-400/90"
                  : m.session_matched === false
                    ? "text-amber-400"
                    : "text-cyan-400/90"
              }
            >
              {m.session_strict && m.shown_nodes === 0
                ? "session strict · empty"
                : m.session_matched === false
                  ? "session ∅ → full"
                  : `session +${m.session_expand ?? 0} hop`}
            </span>
          )}
        </div>
      )}

      {emergenceNote && (
        <div className="px-3 py-1 text-[10px] font-mono text-amber-300/95 border-b border-amber-500/20 bg-amber-500/5">
          {emergenceNote}
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
        {" — "}
        <span className="text-amber-200/80">amber ring</span>
        {" = high TS heat (activation × instability). "}
        White ring = last path (retrieval ∪ probe ∪ query node).
      </div>

      {linkHover && (
        <div className="px-3 py-1 text-[10px] font-mono text-ts-purple-light/95 border-b border-ts-purple/15 truncate">
          edge: {linkHover.relation ?? "relates"} · {linkHover.src.slice(0, 24)} →{" "}
          {linkHover.dst.slice(0, 24)}
        </div>
      )}

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
            linkDirectionalParticles={0}
            nodeLabel={(n: { id: string; label?: string }) => n.id}
            nodeCanvasObject={nodeCanvasObject}
            onNodeHover={(n: { id?: string } | null) => setHoverId(n?.id ?? null)}
            onLinkHover={(link: { source?: unknown; target?: unknown } | null) => {
              if (!link || typeof link !== "object") {
                setLinkHover(null);
                return;
              }
              const l = link as {
                source?: string | { id?: string };
                target?: string | { id?: string };
                weight?: number;
                relation?: string;
              };
              const src =
                typeof l.source === "object" && l.source?.id
                  ? l.source.id
                  : String(l.source ?? "");
              const dst =
                typeof l.target === "object" && l.target?.id
                  ? l.target.id
                  : String(l.target ?? "");
              setLinkHover({
                src,
                dst,
                weight: l.weight ?? 0.2,
                relation: l.relation,
              });
            }}
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
