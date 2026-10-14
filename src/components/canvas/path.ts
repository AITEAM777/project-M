import type { MindNode, Relation, RelationEdge } from "./types";

/** Relations that say nothing about order (ignored when tracing a path to a goal). */
const NEUTRAL: Relation[] = ["RELATED_TO", "COMBINES_WITH", "CONFLICTS_WITH"];

/**
 * Arrows point from what has to come first to what it leads to (A → B: A feeds B).
 * "A depends on B" is the exception: B has to come first.
 */
export function prerequisiteEdge(e: RelationEdge): { from: string; to: string } | null {
  const rel = (e.data?.relation ?? "RELATED_TO") as Relation;
  if (NEUTRAL.includes(rel)) return null;
  return rel === "DEPENDS_ON" ? { from: e.target, to: e.source } : { from: e.source, to: e.target };
}

export type StepState = "done" | "blocked" | "open" | "idea";
export interface PathStep { id: string; title: string; kind: string; state: StepState; reason?: string; depth: number }

/** Is this card finished? (linked task done, goal/project at 100%, question answered…) */
export function nodeState(n: MindNode, blockers: MindNode[]): { state: StepState; reason?: string } {
  const d = n.data, l = d.linked;
  const done =
    l?.task?.status === "DONE" ||
    (l?.goal && (l.goal.progress >= 100 || l.goal.status === "COMPLETED")) ||
    (l?.project && (l.project.progress >= 100 || l.project.status === "COMPLETED")) ||
    ((d.kind === "QUESTION" || d.kind === "DECISION") && d.description.trim().length > 0);
  if (done) return { state: "done" };
  if (blockers.length) return { state: "blocked", reason: "blocked-by" };
  if (d.kind === "QUESTION") return { state: "blocked", reason: "question" };
  if (d.kind === "DECISION") return { state: "blocked", reason: "decision" };
  if (l?.task || l?.goal || l?.project || l?.habit || ["TASK", "MILESTONE", "GOAL", "PROJECT", "HABIT"].includes(d.kind)) return { state: "open" };
  return { state: "idea" };
}

/**
 * Everything upstream of `goalId`, ordered so prerequisites come first, with a status per card.
 * Returns the ids involved (for highlighting) and the edges on the path.
 */
export function pathToGoal(goalId: string, nodes: MindNode[], edges: RelationEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, { from: string; edge: RelationEdge }[]>();
  for (const e of edges) {
    const p = prerequisiteEdge(e);
    if (!p || !byId.has(p.from) || !byId.has(p.to)) continue;
    (incoming.get(p.to) ?? incoming.set(p.to, []).get(p.to)!).push({ from: p.from, edge: e });
  }
  // Walk upstream, remembering the longest distance from the goal (for ordering).
  const depth = new Map<string, number>([[goalId, 0]]);
  const pathEdges = new Set<string>();
  const queue = [goalId];
  let guard = 0;
  while (queue.length && guard++ < 5000) {
    const cur = queue.shift()!;
    for (const { from, edge } of incoming.get(cur) ?? []) {
      pathEdges.add(edge.id);
      const nd = (depth.get(cur) ?? 0) + 1;
      if ((depth.get(from) ?? -1) < nd && nd < 60) { depth.set(from, nd); queue.push(from); }
    }
  }
  const ids = new Set(depth.keys());
  // A card is blocked by an unfinished BLOCKS-arrow source.
  const states = new Map<string, { state: StepState; reason?: string; blockers: MindNode[] }>();
  const resolve = (id: string, seen = new Set<string>()): { state: StepState; reason?: string; blockers: MindNode[] } => {
    const cached = states.get(id);
    if (cached) return cached;
    const n = byId.get(id)!;
    const blockers: MindNode[] = [];
    if (!seen.has(id)) {
      seen.add(id);
      for (const { from, edge } of incoming.get(id) ?? []) {
        if (edge.data?.relation !== "BLOCKS") continue;
        if (resolve(from, seen).state !== "done") blockers.push(byId.get(from)!);
      }
    }
    const s = { ...nodeState(n, blockers), blockers };
    states.set(id, s);
    return s;
  };
  const steps: PathStep[] = [...ids]
    .filter((id) => id !== goalId)
    .map((id) => {
      const n = byId.get(id)!, s = resolve(id);
      return { id, title: n.data.title, kind: n.data.kind, state: s.state, reason: s.reason === "blocked-by" ? s.blockers.map((b) => b.data.title || "…").join(", ") : s.reason, depth: depth.get(id)! };
    })
    .sort((a, b) => b.depth - a.depth || a.title.localeCompare(b.title));
  const next = steps.find((s) => s.state === "blocked") ?? steps.find((s) => s.state === "open");
  return {
    ids,
    edges: pathEdges,
    steps,
    goal: resolve(goalId),
    next: next ?? null,
    done: steps.filter((s) => s.state === "done").length,
    blocked: steps.filter((s) => s.state === "blocked").length,
  };
}
