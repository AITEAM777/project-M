import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, requireUser, route } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { uid } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Restores a Nodera JSON export into a NEW workspace (never overwrites existing data).
 * Every id is remapped, so the same export can be imported repeatedly.
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  const text = await req.text();
  if (text.length > 50 * 1024 * 1024) throw new HttpError(413, "Export file too large");
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Not a valid JSON file");
  }
  if (data?.format !== "nodera-export" || !data.workspace) throw new HttpError(400, "This is not a Nodera export file");
  const owned = await prisma.workspace.count({ where: { ownerId: user.id } });
  if (owned >= limitsFor(user.plan).workspaces) throw new HttpError(402, "Workspace limit reached for your plan");
  const w = data.workspace;
  const ids = new Map<string, string>();
  const map = (old: string | null | undefined, prefix = "") => {
    if (!old) return null;
    if (!ids.has(old)) ids.set(old, prefix ? uid(prefix) : uid("c"));
    return ids.get(old)!;
  };
  const d = (v: any) => (v ? new Date(v) : null);
  const arr = (v: any) => (Array.isArray(v) ? v : []);

  const ws = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({ data: { name: `${String(w.name ?? "Imported").slice(0, 60)} (imported)`, icon: w.icon ?? "📦", ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } } });
    const W = ws.id;
    // Folders: parents before children.
    const folders = arr(w.folders);
    folders.forEach((f: any) => map(f.id));
    await tx.folder.createMany({ data: folders.map((f: any) => ({ id: map(f.id)!, workspaceId: W, parentId: map(f.parentId), name: f.name, color: f.color, icon: f.icon, position: f.position ?? 0, favorite: !!f.favorite, archivedAt: d(f.archivedAt) })) });
    await tx.goal.createMany({ data: arr(w.goals).map((g: any) => ({ id: map(g.id)!, workspaceId: W, folderId: map(g.folderId), title: g.title, description: g.description ?? "", category: g.category ?? "", priority: g.priority, status: g.status, startDate: d(g.startDate), targetDate: d(g.targetDate), motivation: g.motivation ?? "", successCriteria: g.successCriteria ?? "", autoProgress: g.autoProgress ?? true, manualProgress: g.manualProgress ?? 0 })) });
    await tx.milestone.createMany({ data: arr(w.goals).flatMap((g: any) => arr(g.milestones).map((m: any) => ({ id: map(m.id)!, goalId: map(g.id)!, title: m.title, done: !!m.done, dueDate: d(m.dueDate), position: m.position ?? 0, completedAt: d(m.completedAt) }))) });
    await tx.goalDependency.createMany({ data: arr(w.goals).flatMap((g: any) => arr(g.dependsOn).map((x: any) => ({ goalId: map(x.goalId)!, dependsOnId: map(x.dependsOnId)! }))), skipDuplicates: true });
    await tx.project.createMany({ data: arr(w.projects).map((p: any) => ({ id: map(p.id)!, workspaceId: W, folderId: map(p.folderId), goalId: map(p.goalId), title: p.title, description: p.description ?? "", status: p.status, color: p.color, startDate: d(p.startDate), dueDate: d(p.dueDate), favorite: !!p.favorite, archivedAt: d(p.archivedAt) })) });
    await tx.task.createMany({ data: arr(w.tasks).map((t: any) => ({ id: map(t.id)!, workspaceId: W, projectId: map(t.projectId), goalId: map(t.goalId), milestoneId: map(t.milestoneId), title: t.title, description: t.description ?? "", status: t.status, priority: t.priority, tags: t.tags ?? [], dueDate: d(t.dueDate), scheduledStart: d(t.scheduledStart), scheduledEnd: d(t.scheduledEnd), estimateMinutes: t.estimateMinutes, actualMinutes: t.actualMinutes, recurrence: t.recurrence, position: t.position ?? 0, completedAt: d(t.completedAt) })) });
    await tx.taskDependency.createMany({ data: arr(w.tasks).flatMap((t: any) => arr(t.dependsOn).map((x: any) => ({ taskId: map(x.taskId)!, dependsOnId: map(x.dependsOnId)! }))), skipDuplicates: true });
    await tx.habit.createMany({ data: arr(w.habits).map((h: any) => ({ id: map(h.id)!, workspaceId: W, goalId: map(h.goalId), title: h.title, description: h.description ?? "", icon: h.icon, color: h.color, frequency: h.frequency, targetPerPeriod: h.targetPerPeriod, unit: h.unit, reminderTime: h.reminderTime, archivedAt: d(h.archivedAt) })) });
    await tx.habitLog.createMany({ data: arr(w.habits).flatMap((h: any) => arr(h.logs).map((l: any) => ({ habitId: map(h.id)!, date: new Date(l.date), count: l.count }))), skipDuplicates: true });
    await tx.note.createMany({ data: arr(w.notes).map((n: any) => ({ id: map(n.id)!, workspaceId: W, folderId: map(n.folderId), kind: n.kind, title: n.title, content: n.content as Prisma.InputJsonValue, contentText: n.contentText ?? "", tags: n.tags ?? [], favorite: !!n.favorite, archivedAt: d(n.archivedAt), createdById: user.id, createdAt: d(n.createdAt) ?? undefined })) });
    await tx.noteLink.createMany({ data: arr(w.notes).flatMap((n: any) => arr(n.linksOut).filter((l: any) => ids.has(l.targetId)).map((l: any) => ({ sourceId: map(n.id)!, targetId: map(l.targetId)! }))), skipDuplicates: true });
    for (const m of arr(w.maps)) {
      const mid = map(m.id)!;
      await tx.mindMap.create({ data: { id: mid, workspaceId: W, folderId: map(m.folderId), title: m.title, description: m.description ?? "", viewport: m.viewport ?? undefined, favorite: !!m.favorite, archivedAt: d(m.archivedAt) } });
      await tx.mapNode.createMany({ data: arr(m.nodes).map((n: any) => ({ id: map(n.id, "n_")!, mapId: mid, kind: n.kind, title: n.title, description: n.description ?? "", color: n.color ?? "", shape: n.shape ?? "rounded", icon: n.icon ?? "", x: n.x, y: n.y, width: n.width, height: n.height, collapsed: !!n.collapsed, parentId: map(n.parentId, "n_"), tags: n.tags ?? [], links: n.links ?? [], noteId: map(n.noteId), taskId: map(n.taskId), goalId: map(n.goalId), projectId: map(n.projectId), habitId: map(n.habitId) })) });
      await tx.mapEdge.createMany({ data: arr(m.edges).map((e: any) => ({ id: uid("e_"), mapId: mid, sourceId: map(e.sourceId, "n_")!, targetId: map(e.targetId, "n_")!, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, relation: e.relation, label: e.label ?? "", description: e.description ?? "", bidirectional: !!e.bidirectional })) });
    }
    await tx.calendarEvent.createMany({ data: arr(w.events).map((e: any) => ({ id: map(e.id)!, workspaceId: W, title: e.title, description: e.description ?? "", start: new Date(e.start), end: new Date(e.end), allDay: !!e.allDay, color: e.color, category: e.category ?? "", recurrence: e.recurrence, recurUntil: d(e.recurUntil), taskId: map(e.taskId), habitId: map(e.habitId) })) });
    await tx.eventGoal.createMany({ data: arr(w.events).flatMap((e: any) => arr(e.goals).map((g: any) => ({ eventId: map(e.id)!, goalId: map(g.goalId)! }))), skipDuplicates: true });
    return ws;
  }, { timeout: 60_000 });
  return { workspace: { ...ws, role: "OWNER" } };
});
