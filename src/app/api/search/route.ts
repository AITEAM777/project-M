import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { route, userAndWorkspace } from "@/lib/http";

/**
 * Global search across notes, thoughts, nodes, tasks, goals, projects, maps, habits, folders.
 * Filters: type, tag, status, from/to (updatedAt). Uses ILIKE + GIN-indexed tag arrays —
 * swap in Postgres full-text (tsvector) or Meilisearch when data grows.
 */
export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 200);
  const tag = sp.get("tag")?.trim() || undefined;
  const types = new Set((sp.get("types") ?? "note,thought,node,task,goal,project,map,habit,folder").split(","));
  const status = sp.get("status") || undefined;
  const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
  const to = sp.get("to") ? new Date(sp.get("to")!) : undefined;
  const take = Math.min(Number(sp.get("limit") || 12), 50);
  if (!q && !tag && !status && !from) return { results: [], total: 0 };
  const like = q ? { contains: q, mode: "insensitive" as const } : undefined;
  const dates = from || to ? { updatedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

  const jobs: Promise<{ type: string; id: string; title: string; snippet?: string; href: string; meta?: string; updatedAt?: Date }[]>[] = [];

  if (types.has("note") || types.has("thought")) {
    const kinds = [types.has("note") && "NOTE", types.has("thought") && "THOUGHT"].filter(Boolean) as ("NOTE" | "THOUGHT")[];
    const where: Prisma.NoteWhereInput = { workspaceId, kind: { in: kinds }, archivedAt: null, ...dates };
    if (like) where.OR = [{ title: like }, { contentText: like }, { tags: { has: q.toLowerCase() } }];
    if (tag) where.tags = { has: tag };
    jobs.push(
      prisma.note
        .findMany({ where, take, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, kind: true, contentText: true, updatedAt: true, folder: { select: { name: true } } } })
        .then((rows) => rows.map((n) => ({ type: n.kind === "THOUGHT" ? "thought" : "note", id: n.id, title: n.title, snippet: snippet(n.contentText, q), href: `/notes/${n.id}`, meta: n.folder?.name, updatedAt: n.updatedAt }))),
    );
  }
  if (types.has("node") && !status) {
    const where: Prisma.MapNodeWhereInput = { map: { workspaceId, archivedAt: null }, ...dates };
    if (like) where.OR = [{ title: like }, { description: like }];
    if (tag) where.tags = { has: tag };
    jobs.push(
      prisma.mapNode
        .findMany({ where, take, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, kind: true, description: true, mapId: true, updatedAt: true, map: { select: { title: true } } } })
        .then((rows) => rows.map((n) => ({ type: "node", id: n.id, title: n.title || "(untitled node)", snippet: snippet(n.description, q), href: `/maps/${n.mapId}?node=${n.id}`, meta: `${n.kind.toLowerCase()} · ${n.map.title}`, updatedAt: n.updatedAt }))),
    );
  }
  if (types.has("task")) {
    const where: Prisma.TaskWhereInput = { workspaceId, ...dates };
    if (like) where.OR = [{ title: like }, { description: like }];
    if (tag) where.tags = { has: tag };
    if (status === "TODO" || status === "IN_PROGRESS" || status === "DONE") where.status = status;
    jobs.push(
      prisma.task
        .findMany({ where, take, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, status: true, description: true, updatedAt: true, project: { select: { title: true } } } })
        .then((rows) => rows.map((t) => ({ type: "task", id: t.id, title: t.title, snippet: snippet(t.description, q), href: `/tasks?task=${t.id}`, meta: [t.status.replace("_", " ").toLowerCase(), t.project?.title].filter(Boolean).join(" · "), updatedAt: t.updatedAt }))),
    );
  }
  if (types.has("goal") && !tag) {
    const where: Prisma.GoalWhereInput = { workspaceId, ...dates };
    if (like) where.OR = [{ title: like }, { description: like }, { category: like }, { motivation: like }];
    if (status && ["NOT_STARTED", "ACTIVE", "ON_HOLD", "COMPLETED", "ABANDONED"].includes(status)) where.status = status as never;
    jobs.push(
      prisma.goal
        .findMany({ where, take, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, description: true, category: true, status: true, updatedAt: true } })
        .then((rows) => rows.map((g) => ({ type: "goal", id: g.id, title: g.title, snippet: snippet(g.description, q), href: `/goals/${g.id}`, meta: [g.category, g.status.toLowerCase()].filter(Boolean).join(" · "), updatedAt: g.updatedAt }))),
    );
  }
  if (types.has("project") && !tag) {
    const where: Prisma.ProjectWhereInput = { workspaceId, archivedAt: null, ...dates };
    if (like) where.OR = [{ title: like }, { description: like }];
    if (status && ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"].includes(status)) where.status = status as never;
    jobs.push(
      prisma.project
        .findMany({ where, take, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, description: true, status: true, updatedAt: true } })
        .then((rows) => rows.map((p) => ({ type: "project", id: p.id, title: p.title, snippet: snippet(p.description, q), href: `/projects/${p.id}`, meta: p.status.toLowerCase(), updatedAt: p.updatedAt }))),
    );
  }
  if (types.has("map") && !tag && !status && like) {
    jobs.push(
      prisma.mindMap
        .findMany({ where: { workspaceId, archivedAt: null, OR: [{ title: like }, { description: like }], ...dates }, take, select: { id: true, title: true, description: true, updatedAt: true } })
        .then((rows) => rows.map((m) => ({ type: "map", id: m.id, title: m.title, snippet: snippet(m.description, q), href: `/maps/${m.id}`, updatedAt: m.updatedAt }))),
    );
  }
  if (types.has("habit") && !tag && !status && like) {
    jobs.push(
      prisma.habit
        .findMany({ where: { workspaceId, archivedAt: null, title: like }, take, select: { id: true, title: true, icon: true, updatedAt: true } })
        .then((rows) => rows.map((h) => ({ type: "habit", id: h.id, title: `${h.icon} ${h.title}`, href: `/habits?habit=${h.id}`, updatedAt: h.updatedAt }))),
    );
  }
  if (types.has("folder") && !tag && !status && like) {
    jobs.push(
      prisma.folder
        .findMany({ where: { workspaceId, archivedAt: null, name: like }, take, select: { id: true, name: true, icon: true, updatedAt: true } })
        .then((rows) => rows.map((f) => ({ type: "folder", id: f.id, title: `${f.icon} ${f.name}`, href: `/folders/${f.id}`, updatedAt: f.updatedAt }))),
    );
  }
  const results = (await Promise.all(jobs)).flat();
  // Rank: exact title match > title prefix > title contains > recency.
  const ql = q.toLowerCase();
  const score = (t: string) => (!ql ? 0 : t.toLowerCase() === ql ? 3 : t.toLowerCase().startsWith(ql) ? 2 : t.toLowerCase().includes(ql) ? 1 : 0);
  results.sort((a, b) => score(b.title) - score(a.title) || (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
  return { results, total: results.length };
});

function snippet(text: string, q: string) {
  if (!text) return undefined;
  if (!q) return text.slice(0, 140);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, 140);
  const start = Math.max(0, i - 50);
  return (start > 0 ? "…" : "") + text.slice(start, i + q.length + 90).replace(/\s+/g, " ");
}
