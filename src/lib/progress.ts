/** Pure progress calculations — shared by API, dashboard and tests. */

export interface ProgressInput {
  autoProgress: boolean;
  manualProgress: number;
  status?: string;
  milestones: { done: boolean }[];
  tasks: { status: string }[];
}

/**
 * Goal progress. With `autoProgress`, every milestone and every linked task
 * (direct or through a linked project) counts as one unit of work.
 * We never invent progress: no units → 0% (unless the goal is marked completed).
 */
export function goalProgress(g: ProgressInput): number {
  if (g.status === "COMPLETED") return 100;
  if (!g.autoProgress) return clampPct(g.manualProgress);
  const total = g.milestones.length + g.tasks.length;
  if (total === 0) return 0;
  const done = g.milestones.filter((m) => m.done).length + g.tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / total) * 100);
}

export function taskProgress(tasks: { status: string }[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Merges tasks linked directly to a goal with tasks of projects linked to it (dedup by id). */
export function collectGoalTasks<T extends { id: string }>(direct: T[], projects: { tasks: T[] }[]): T[] {
  const map = new Map<string, T>();
  for (const t of direct) map.set(t.id, t);
  for (const p of projects) for (const t of p.tasks) map.set(t.id, t);
  return [...map.values()];
}
