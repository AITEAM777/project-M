"use client";
import { tr, translated } from "@/lib/i18n";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, ReactFlowProvider, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { ArrowLeft, ExternalLink, Network, Search, X } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { RELATION_META, type Relation } from "@/components/canvas/types";
import { cn } from "@/lib/utils";

type GNode = { id: string; type: string; label: string; folderId?: string | null; color?: string; href: string; status?: string };
type GEdge = { id: string; source: string; target: string; relation: Relation };

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = translated({
  goal: { label: "Goals", color: "#ef4444", icon: "🎯" },
  project: { label: "Projects", color: "#8b5cf6", icon: "📦" },
  task: { label: "Tasks", color: "#10b981", icon: "✅" },
  habit: { label: "Habits", color: "#14b8a6", icon: "🔁" },
  note: { label: "Notes", color: "#64748b", icon: "📝" },
  thought: { label: "Thoughts", color: "#f59e0b", icon: "💭" },
  folder: { label: "Folders", color: "#3b82f6", icon: "📁" },
  node: { label: "Map thoughts", color: "#6366f1", icon: "◦" },
});

type GData = { label: string; type: string; dim: boolean; highlight: boolean; degree: number; done: boolean };

const GraphNode = memo(function GraphNode({ data, selected }: NodeProps<Node<GData>>) {
  const m = TYPE_META[data.type];
  const size = Math.min(16, 7 + data.degree * 1.2);
  return (
    <div className={cn("flex items-center gap-1.5 transition-opacity", data.dim && "opacity-15")} title={data.label}>
      <Handle type="target" position={Position.Left} className="!pointer-events-none !opacity-0" style={{ left: size / 2 }} />
      <span className={cn("shrink-0 rounded-full border-2 border-[var(--surface)] shadow", selected && "ring-2 ring-[var(--accent)]", data.highlight && "ring-2 ring-[var(--warning)]")}
        style={{ width: size * 2, height: size * 2, background: m.color, opacity: data.done ? 0.5 : 1 }} />
      <span className={cn("max-w-44 truncate rounded px-1 text-[11px] font-medium", data.type === "folder" || data.type === "goal" ? "text-[var(--text)]" : "text-[var(--text-2)]")}
        style={{ background: "color-mix(in oklab, var(--bg) 75%, transparent)" }}>{data.label}</span>
      <Handle type="source" position={Position.Right} className="!pointer-events-none !opacity-0" style={{ left: size / 2 }} />
    </div>
  );
});
const nodeTypes = { g: GraphNode };

function layout(nodes: GNode[], edges: GEdge[]) {
  type SN = SimulationNodeDatum & { id: string };
  const sn: SN[] = nodes.map((n, i) => ({ id: n.id, x: Math.cos(i) * 300 + (i % 7) * 10, y: Math.sin(i) * 300 + (i % 5) * 10 }));
  const links: SimulationLinkDatum<SN>[] = edges.map((e) => ({ source: e.source, target: e.target }));
  const sim = forceSimulation(sn)
    .force("link", forceLink<SN, SimulationLinkDatum<SN>>(links).id((d) => d.id).distance(90).strength(0.6))
    .force("charge", forceManyBody().strength(-260).distanceMax(900))
    .force("collide", forceCollide(46))
    .force("x", forceX(0).strength(0.03))
    .force("y", forceY(0).strength(0.05))
    .stop();
  const ticks = Math.min(400, 120 + Math.round(30000 / Math.max(1, nodes.length)));
  for (let i = 0; i < ticks; i++) sim.tick();
  return new Map(sn.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}

export default function GraphPage() {
  const [types, setTypes] = useState<Set<string>>(new Set(["goal", "project", "task", "habit", "note", "thought", "folder"]));
  const [includeNodes, setIncludeNodes] = useState(false);
  const [hideIsolated, setHideIsolated] = useState(true);
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const { data } = useApi<{ nodes: GNode[]; edges: GEdge[] }>(`/api/graph?nodes=${includeNodes ? 1 : 0}&tasks=${types.has("task") ? 1 : 0}&folders=${types.has("folder") ? 1 : 0}`);

  const filtered = useMemo(() => {
    if (!data) return null;
    const ns = data.nodes.filter((n) => types.has(n.type) || (n.type === "node" && includeNodes));
    const ids = new Set(ns.map((n) => n.id));
    const es = data.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const degree = new Map<string, number>();
    es.forEach((e) => { degree.set(e.source, (degree.get(e.source) ?? 0) + 1); degree.set(e.target, (degree.get(e.target) ?? 0) + 1); });
    const final = hideIsolated ? ns.filter((n) => degree.get(n.id)) : ns;
    return { nodes: final, edges: es, degree };
  }, [data, types, includeNodes, hideIsolated]);

  const positions = useMemo(() => (filtered ? layout(filtered.nodes, filtered.edges) : new Map()), [filtered]);

  const focus = hover ?? sel;
  const neighbours = useMemo(() => {
    if (!focus || !filtered) return null;
    const s = new Set([focus]);
    filtered.edges.forEach((e) => { if (e.source === focus) s.add(e.target); if (e.target === focus) s.add(e.source); });
    return s;
  }, [focus, filtered]);
  const ql = q.trim().toLowerCase();

  const rfNodes: Node<GData>[] = useMemo(() => (filtered?.nodes ?? []).map((n) => ({
    id: n.id, type: "g", position: positions.get(n.id) ?? { x: 0, y: 0 }, selected: n.id === sel,
    data: { label: n.label, type: n.type, degree: filtered!.degree.get(n.id) ?? 0, done: n.status === "DONE" || n.status === "COMPLETED", dim: !!neighbours && !neighbours.has(n.id), highlight: !!ql && n.label.toLowerCase().includes(ql) },
  })), [filtered, positions, neighbours, ql, sel]);
  const rfEdges: Edge[] = useMemo(() => (filtered?.edges ?? []).map((e) => {
    const on = !neighbours || (neighbours.has(e.source) && neighbours.has(e.target) && (e.source === focus || e.target === focus));
    return { id: e.id, source: e.source, target: e.target, style: { stroke: RELATION_META[e.relation]?.color ?? "#94a3b8", strokeWidth: on && neighbours ? 2 : 1.1, opacity: on ? (e.relation === "PART_OF" ? 0.45 : 0.85) : 0.06 }, animated: !!neighbours && on && e.relation !== "PART_OF" };
  }), [filtered, neighbours, focus]);

  const selected = data?.nodes.find((n) => n.id === sel);
  const selEdges = filtered?.edges.filter((e) => e.source === sel || e.target === sel) ?? [];
  const label = (id: string) => data?.nodes.find((n) => n.id === id)?.label ?? "";

  return (
    <div className="absolute inset-0">
      {!filtered ? <div className="grid h-full place-items-center"><Spinner className="size-7" /></div> : (
        <ReactFlowProvider>
          <ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} fitView minZoom={0.05} maxZoom={2} nodesConnectable={false} nodesDraggable elementsSelectable
            onNodeMouseEnter={(_, n) => setHover(n.id)} onNodeMouseLeave={() => setHover(null)} onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)}
            onlyRenderVisibleElements proOptions={{ hideAttribution: true }}>
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="var(--canvas-dot)" />
            <Controls position="bottom-left" showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
        <div data-tour="graph-filters" className="pointer-events-auto w-full max-w-xs rounded-xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur sm:w-72">
          <div className="mb-2 flex items-center gap-2">
            <Link href="/dashboard" className="text-muted hover:text-text" aria-label={tr("Back")}><ArrowLeft className="size-4" /></Link>
            <Network className="size-4 text-accent" />
            <h1 className="text-sm font-semibold">{tr("Knowledge Graph")}</h1>
            <span className="ml-auto text-xs text-muted tabular">{filtered?.nodes.length ?? 0} · {filtered?.edges.length ?? 0}</span>
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Highlight…")} className="h-8 pl-8" aria-label={tr("Highlight nodes")} />
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(TYPE_META).filter(([k]) => k !== "node").map(([k, m]) => (
              <button key={k} onClick={() => setTypes((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", types.has(k) ? "border-transparent text-white" : "border-border text-muted")}
                style={types.has(k) ? { background: m.color } : undefined}>{m.label}</button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-text-2"><input type="checkbox" checked={includeNodes} onChange={(e) => setIncludeNodes(e.target.checked)} className="accent-[var(--accent)]" />{" "}{tr("Include unlinked map thoughts")}</label>
          <label className="mt-1 flex items-center gap-2 text-xs text-text-2"><input type="checkbox" checked={hideIsolated} onChange={(e) => setHideIsolated(e.target.checked)} className="accent-[var(--accent)]" />{" "}{tr("Hide unconnected items")}</label>
          <p className="mt-2 text-[11px] leading-snug text-muted">{tr("Cross-folder links appear here automatically: tasks → projects → goals, note links, and every connection you draw on any mind map.")}</p>
        </div>
      </div>
      {filtered && !filtered.nodes.length && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-card">
            <p className="font-semibold">{tr("Your graph is still empty")}</p>
            <p className="mt-1 text-sm text-muted">{tr("Link tasks to projects and goals, connect notes, or draw connections on a mind map — they’ll show up here.")}</p>
          </div>
        </div>
      )}
      {selected && (
        <aside className="absolute right-3 top-3 z-10 w-72 rounded-xl border border-border bg-surface p-4 shadow-pop animate-slide-in">
          <div className="flex items-start gap-2">
            <span>{TYPE_META[selected.type]?.icon}</span>
            <p className="flex-1 font-semibold leading-snug">{selected.label}</p>
            <button onClick={() => setSel(null)} className="text-muted hover:text-text" aria-label={tr("Close")}><X className="size-4" /></button>
          </div>
          <p className="mt-0.5 text-xs capitalize text-muted">{selected.type}{selected.status ? ` · ${selected.status.toLowerCase().replace("_", " ")}` : ""}</p>
          <Link href={selected.href}><Button size="sm" className="mt-3 w-full"><ExternalLink className="size-3.5" />{" "}{tr("Open")}</Button></Link>
          {selEdges.length > 0 && (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
              {selEdges.map((e) => {
                const out = e.source === sel;
                return (
                  <li key={e.id}><button className="w-full truncate text-left hover:underline" onClick={() => setSel(out ? e.target : e.source)}>
                    <span className="text-xs font-medium" style={{ color: RELATION_META[e.relation]?.color }}>{out ? "" : "← "}{RELATION_META[e.relation]?.label}</span> {label(out ? e.target : e.source)}
                  </button></li>
                );
              })}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
