import dagre from "@dagrejs/dagre";
import type { MindNode, RelationEdge } from "./types";

/** Nodes reachable by following outgoing edges from `id` (cycle-safe). */
export function descendants(id: string, edges: RelationEdge[]): Set<string> {
  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  const seen = new Set<string>();
  const stack = [...(out.get(id) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === id || seen.has(n)) continue;
    seen.add(n);
    stack.push(...(out.get(n) ?? []));
  }
  return seen;
}

/**
 * Nodes hidden because an ancestor branch is collapsed. A node that is also reachable
 * from a visible, non-collapsed node stays visible. O(nodes + edges).
 */
export function computeHidden(nodes: MindNode[], edges: RelationEdge[]) {
  const hidden = new Set<string>();
  const counts = new Map<string, number>();
  const collapsed = new Set(nodes.filter((n) => n.data.collapsed).map((n) => n.id));
  if (!collapsed.size) return { hidden, counts };
  const candidates = new Set<string>();
  for (const id of collapsed) {
    const d = descendants(id, edges);
    counts.set(id, d.size);
    d.forEach((x) => candidates.add(x));
  }
  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  const visible = new Set(nodes.map((n) => n.id).filter((id) => !candidates.has(id)));
  const queue = [...visible].filter((id) => !collapsed.has(id));
  while (queue.length) {
    const id = queue.pop()!;
    for (const t of out.get(id) ?? []) {
      if (visible.has(t)) continue;
      visible.add(t);
      if (!collapsed.has(t)) queue.push(t);
    }
  }
  for (const id of candidates) if (!visible.has(id)) hidden.add(id);
  return { hidden, counts };
}

/** Tidy tree layout via dagre. Group children keep relative positions. */
export function autoLayout(nodes: MindNode[], edges: RelationEdge[], direction: "LR" | "TB" = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: direction === "LR" ? 28 : 50, ranksep: direction === "LR" ? 110 : 90, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  const top = nodes.filter((n) => !n.parentId);
  for (const n of top) g.setNode(n.id, { width: n.measured?.width ?? n.width ?? 200, height: n.measured?.height ?? n.height ?? 64 });
  const topIds = new Set(top.map((n) => n.id));
  const parentOf = new Map(nodes.filter((n) => n.parentId).map((n) => [n.id, n.parentId!]));
  for (const e of edges) {
    const s = topIds.has(e.source) ? e.source : parentOf.get(e.source);
    const t = topIds.has(e.target) ? e.target : parentOf.get(e.target);
    if (s && t && s !== t) g.setEdge(s, t);
  }
  dagre.layout(g);
  return nodes.map((n) => {
    if (n.parentId) return n;
    const p = g.node(n.id);
    if (!p) return n;
    return { ...n, position: { x: Math.round(p.x - p.width / 2), y: Math.round(p.y - p.height / 2) } };
  });
}
