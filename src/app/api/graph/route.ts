import { prisma } from "@/lib/db";
import { route, userAndWorkspace } from "@/lib/http";

type GNode = { id: string; type: string; label: string; folderId?: string | null; color?: string; href: string; status?: string };
type GEdge = { id: string; source: string; target: string; relation: string };

/**
 * Workspace-wide knowledge graph: entities plus every relationship between them —
 * structural (task→project→goal, item→folder), note [[links]], and canvas edges
 * resolved to the entities their nodes reference (so links cross maps and folders).
 */
export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const includeTasks = sp.get("tasks") !== "0";
  const includeNodes = sp.get("nodes") === "1";
  const includeFolders = sp.get("folders") !== "0";

  const [folders, notes, goals, projects, tasks, habits, mapNodes, mapEdges, noteLinks] = await Promise.all([
    includeFolders ? prisma.folder.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, name: true, icon: true, color: true, parentId: true } }) : [],
    prisma.note.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, title: true, kind: true, folderId: true }, take: 1500, orderBy: { updatedAt: "desc" } }),
    prisma.goal.findMany({ where: { workspaceId }, select: { id: true, title: true, status: true, folderId: true } }),
    prisma.project.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, title: true, status: true, color: true, folderId: true, goalId: true } }),
    includeTasks ? prisma.task.findMany({ where: { workspaceId }, select: { id: true, title: true, status: true, projectId: true, goalId: true }, take: 1500, orderBy: { updatedAt: "desc" } }) : [],
    prisma.habit.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, title: true, icon: true, goalId: true } }),
    prisma.mapNode.findMany({
      where: { map: { workspaceId, archivedAt: null } },
      select: { id: true, title: true, kind: true, mapId: true, noteId: true, taskId: true, goalId: true, projectId: true, habitId: true, map: { select: { folderId: true } } },
      take: 5000,
    }),
    prisma.mapEdge.findMany({ where: { map: { workspaceId, archivedAt: null } }, select: { id: true, sourceId: true, targetId: true, relation: true }, take: 15000 }),
    prisma.noteLink.findMany({ where: { source: { workspaceId } }, select: { sourceId: true, targetId: true } }),
  ]);

  const nodes = new Map<string, GNode>();
  const edges = new Map<string, GEdge>();
  const addEdge = (source: string, target: string, relation: string) => {
    if (source === target || !nodes.has(source) || !nodes.has(target)) return;
    const id = `${source}->${target}:${relation}`;
    if (!edges.has(id)) edges.set(id, { id, source, target, relation });
  };

  for (const f of folders) nodes.set(`folder:${f.id}`, { id: `folder:${f.id}`, type: "folder", label: `${f.icon} ${f.name}`, color: f.color, href: `/folders/${f.id}` });
  for (const n of notes) nodes.set(`note:${n.id}`, { id: `note:${n.id}`, type: n.kind === "THOUGHT" ? "thought" : "note", label: n.title, folderId: n.folderId, href: `/notes/${n.id}` });
  for (const g of goals) nodes.set(`goal:${g.id}`, { id: `goal:${g.id}`, type: "goal", label: g.title, folderId: g.folderId, status: g.status, href: `/goals/${g.id}` });
  for (const p of projects) nodes.set(`project:${p.id}`, { id: `project:${p.id}`, type: "project", label: p.title, folderId: p.folderId, color: p.color, status: p.status, href: `/projects/${p.id}` });
  for (const t of tasks) nodes.set(`task:${t.id}`, { id: `task:${t.id}`, type: "task", label: t.title, status: t.status, href: `/tasks?task=${t.id}` });
  for (const h of habits) nodes.set(`habit:${h.id}`, { id: `habit:${h.id}`, type: "habit", label: `${h.icon} ${h.title}`, href: `/habits?habit=${h.id}` });

  // Canvas nodes resolve to the entity they reference; unlinked ones are optional.
  const keyOfNode = new Map<string, string>();
  for (const n of mapNodes) {
    const key = n.taskId ? `task:${n.taskId}` : n.goalId ? `goal:${n.goalId}` : n.projectId ? `project:${n.projectId}` : n.habitId ? `habit:${n.habitId}` : n.noteId ? `note:${n.noteId}` : null;
    if (key && nodes.has(key)) keyOfNode.set(n.id, key);
    else if (includeNodes && n.kind !== "GROUP") {
      const k = `node:${n.id}`;
      nodes.set(k, { id: k, type: "node", label: n.title || "(untitled)", folderId: n.map.folderId, href: `/maps/${n.mapId}?node=${n.id}`, status: n.kind });
      keyOfNode.set(n.id, k);
    }
  }

  if (includeFolders) {
    for (const f of folders) if (f.parentId) addEdge(`folder:${f.id}`, `folder:${f.parentId}`, "PART_OF");
    for (const n of nodes.values()) if (n.folderId) addEdge(n.id, `folder:${n.folderId}`, "PART_OF");
  }
  for (const p of projects) if (p.goalId) addEdge(`project:${p.id}`, `goal:${p.goalId}`, "SUPPORTS");
  for (const t of tasks) {
    if (t.projectId) addEdge(`task:${t.id}`, `project:${t.projectId}`, "PART_OF");
    if (t.goalId) addEdge(`task:${t.id}`, `goal:${t.goalId}`, "SUPPORTS");
  }
  for (const h of habits) if (h.goalId) addEdge(`habit:${h.id}`, `goal:${h.goalId}`, "SUPPORTS");
  for (const l of noteLinks) addEdge(`note:${l.sourceId}`, `note:${l.targetId}`, "RELATED_TO");
  for (const e of mapEdges) {
    const s = keyOfNode.get(e.sourceId);
    const t = keyOfNode.get(e.targetId);
    if (s && t) addEdge(s, t, e.relation);
  }

  // Drop isolated folder nodes to reduce clutter.
  const linked = new Set<string>();
  for (const e of edges.values()) { linked.add(e.source); linked.add(e.target); }
  const out = [...nodes.values()].filter((n) => n.type !== "folder" || linked.has(n.id));
  return { nodes: out, edges: [...edges.values()] };
});
