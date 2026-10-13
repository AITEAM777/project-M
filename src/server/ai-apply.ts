import "server-only";
import type { AiSuggestion, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { uid } from "@/lib/utils";
import type { BreakdownSuggestion, ConnectionsSuggestion, OrganizeSuggestion, PlanSuggestion } from "./ai-schemas";

type Opts = { selected?: number[]; includeSchedule: boolean; tzo: number };

/** Applies an accepted AI suggestion. Only runs after explicit user confirmation. */
export async function applySuggestion(s: AiSuggestion, userId: string, opts: Opts) {
  const ws = s.workspaceId;
  switch (s.kind) {
    case "plan":
      return applyPlan(ws, s.payload as unknown as PlanSuggestion, opts);
    case "connections":
      return applyConnections(ws, s.payload as unknown as ConnectionsSuggestion, opts);
    case "breakdown":
      return applyBreakdown(ws, s.input, s.payload as unknown as BreakdownSuggestion, opts);
    case "organize":
      return applyOrganize(ws, s.payload as unknown as OrganizeSuggestion & { noteId: string });
    default:
      return null; // summaries/reflections are informational
  }
}

function pick<T>(items: T[], selected?: number[]) {
  return selected ? items.filter((_, i) => selected.includes(i)) : items;
}

async function applyPlan(ws: string, plan: PlanSuggestion, opts: Opts) {
  const goals = pick(plan.goals, opts.selected);
  if (!goals.length) throw new HttpError(400, "Select at least one goal");
  return prisma.$transaction(async (tx) => {
    const goalIds = new Map<string, string>();
    const mapId = (await tx.mindMap.create({ data: { workspaceId: ws, title: `Plan: ${goals.map((g) => g.title).slice(0, 3).join(", ")}`.slice(0, 200), description: plan.summary } })).id;
    const nodes: Prisma.MapNodeCreateManyInput[] = [];
    const edges: Prisma.MapEdgeCreateManyInput[] = [];
    const goalNode = new Map<string, string>();
    let col = 0;
    for (const g of goals) {
      const goal = await tx.goal.create({
        data: {
          workspaceId: ws, title: g.title.slice(0, 300), category: g.category.slice(0, 80), description: g.description, motivation: g.motivation, status: "ACTIVE",
          milestones: { create: g.milestones.slice(0, 20).map((title, position) => ({ title: title.slice(0, 300), position })) },
        },
      });
      goalIds.set(g.key, goal.id);
      const x = col * 380;
      const gn = uid("n_");
      goalNode.set(g.key, gn);
      nodes.push({ id: gn, mapId, kind: "GOAL", title: goal.title, x, y: 0, goalId: goal.id, color: "#6366f1" });
      let row = 1;
      for (const t of g.firstTasks.slice(0, 8)) {
        const task = await tx.task.create({ data: { workspaceId: ws, goalId: goal.id, title: t.slice(0, 300) } });
        const id = uid("n_");
        nodes.push({ id, mapId, kind: "TASK", title: task.title, x, y: row++ * 110, taskId: task.id });
        edges.push({ id: uid("e_"), mapId, sourceId: id, targetId: gn, relation: "SUPPORTS" });
      }
      for (const h of g.habits.slice(0, 5)) {
        const habit = await tx.habit.create({
          data: { workspaceId: ws, goalId: goal.id, title: h.title.slice(0, 300), frequency: h.frequency, targetPerPeriod: Math.max(1, Math.min(100, h.targetPerPeriod || 1)), unit: h.unit.slice(0, 30) || "times" },
        });
        const id = uid("n_");
        nodes.push({ id, mapId, kind: "HABIT", title: habit.title, x: x + 30, y: row++ * 110, habitId: habit.id, color: "#10b981" });
        edges.push({ id: uid("e_"), mapId, sourceId: id, targetId: gn, relation: "SUPPORTS" });
      }
      col++;
    }
    for (const c of plan.connections) {
      const a = goalNode.get(c.fromKey);
      const b = goalNode.get(c.toKey);
      if (a && b && a !== b) edges.push({ id: uid("e_"), mapId, sourceId: a, targetId: b, relation: c.relation, label: c.reason.slice(0, 200) });
    }
    await tx.mapNode.createMany({ data: nodes });
    await tx.mapEdge.createMany({ data: edges });

    let events = 0;
    if (opts.includeSchedule) {
      for (const block of plan.schedule.slice(0, 30)) {
        const linked = block.goalKeys.map((k) => goalIds.get(k)).filter(Boolean) as string[];
        if (!linked.length) continue;
        const start = nextLocal(block.dayOfWeek, block.start, opts.tzo);
        if (!start) continue;
        const dur = Math.max(10, Math.min(600, block.durationMinutes || 30));
        await tx.calendarEvent.create({
          data: {
            workspaceId: ws, title: block.title.slice(0, 300), start, end: new Date(start.getTime() + dur * 60_000), recurrence: "WEEKLY",
            goals: { create: linked.map((goalId) => ({ goalId })) },
          },
        });
        events++;
      }
    }
    return { mapId, goals: [...goalIds.values()], events };
  });
}

/** Next occurrence of a weekday + HH:mm in the user's timezone (tzo = getTimezoneOffset minutes). */
function nextLocal(dow: number, hhmm: string, tzo: number) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m || dow < 0 || dow > 6) return null;
  const offsetMs = -tzo * 60_000;
  const localNow = new Date(Date.now() + offsetMs);
  const d = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), Number(m[1]), Number(m[2])));
  let add = (dow - d.getUTCDay() + 7) % 7;
  if (add === 0 && d.getTime() <= localNow.getTime()) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  return new Date(d.getTime() - offsetMs);
}

async function applyConnections(ws: string, payload: ConnectionsSuggestion, opts: Opts) {
  const chosen = pick(payload.suggestions, opts.selected);
  if (!chosen.length) throw new HttpError(400, "Select at least one connection");
  return prisma.$transaction(async (tx) => {
    let map = await tx.mindMap.findFirst({ where: { workspaceId: ws, title: "Discovered connections", archivedAt: null } });
    map ??= await tx.mindMap.create({ data: { workspaceId: ws, title: "Discovered connections", description: "Connections suggested by the assistant and accepted by you." } });
    const existing = await tx.mapNode.findMany({ where: { mapId: map.id } });
    const nodeFor = new Map<string, string>();
    for (const n of existing) {
      const ref = n.goalId ? `goal:${n.goalId}` : n.projectId ? `project:${n.projectId}` : n.habitId ? `habit:${n.habitId}` : n.noteId ? `note:${n.noteId}` : null;
      if (ref) nodeFor.set(ref, n.id);
    }
    let i = existing.length;
    const ensure = async (ref: string) => {
      if (nodeFor.has(ref)) return nodeFor.get(ref)!;
      const [type, id] = ref.split(":");
      const where = { id, workspaceId: ws };
      const ent =
        type === "goal" ? await tx.goal.findFirst({ where, select: { title: true } }) :
        type === "project" ? await tx.project.findFirst({ where, select: { title: true } }) :
        type === "habit" ? await tx.habit.findFirst({ where, select: { title: true } }) :
        type === "note" ? await tx.note.findFirst({ where, select: { title: true } }) : null;
      if (!ent) return null;
      const nid = uid("n_");
      const kind = type === "goal" ? "GOAL" : type === "project" ? "PROJECT" : type === "habit" ? "HABIT" : "NOTE";
      await tx.mapNode.create({
        data: { id: nid, mapId: map!.id, kind, title: ent.title, x: (i % 4) * 320, y: Math.floor(i / 4) * 180, [`${type}Id`]: id },
      });
      i++;
      nodeFor.set(ref, nid);
      return nid;
    };
    let added = 0;
    for (const c of chosen) {
      const a = await ensure(c.sourceRef);
      const b = await ensure(c.targetRef);
      if (!a || !b) continue;
      await tx.mapEdge.create({ data: { id: uid("e_"), mapId: map.id, sourceId: a, targetId: b, relation: c.relation, description: c.reason.slice(0, 2000), label: "" } });
      added++;
    }
    return { mapId: map.id, added };
  });
}

async function applyBreakdown(ws: string, _goalTitle: string, payload: BreakdownSuggestion & { goalId?: string }, opts: Opts) {
  const goalId = payload.goalId;
  if (!goalId) throw new HttpError(400, "Missing goal");
  const goal = await prisma.goal.findFirst({ where: { id: goalId, workspaceId: ws } });
  if (!goal) throw new HttpError(404, "Goal no longer exists");
  const ms = pick(payload.milestones, opts.selected);
  return prisma.$transaction(async (tx) => {
    let position = await tx.milestone.count({ where: { goalId } });
    let tasks = 0;
    for (const m of ms) {
      const milestone = await tx.milestone.create({ data: { goalId, title: m.title.slice(0, 300), position: position++ } });
      for (const t of m.tasks.slice(0, 10)) {
        await tx.task.create({ data: { workspaceId: ws, goalId, milestoneId: milestone.id, title: t.title.slice(0, 300), estimateMinutes: Math.max(0, Math.min(10000, t.estimateMinutes || 0)) || null } });
        tasks++;
      }
    }
    return { goalId, milestones: ms.length, tasks };
  });
}

async function applyOrganize(ws: string, payload: OrganizeSuggestion & { noteId: string }) {
  const note = await prisma.note.findFirst({ where: { id: payload.noteId, workspaceId: ws } });
  if (!note) throw new HttpError(404, "Note no longer exists");
  const folderOk = payload.folderId ? await prisma.folder.findFirst({ where: { id: payload.folderId, workspaceId: ws }, select: { id: true } }) : null;
  const tags = [...new Set([...note.tags, ...payload.tags.map((t) => t.toLowerCase().trim().slice(0, 40))])].slice(0, 30);
  await prisma.$transaction([
    prisma.note.update({ where: { id: note.id }, data: { title: payload.title.slice(0, 300) || note.title, tags, folderId: folderOk ? folderOk.id : note.folderId } }),
    ...payload.nextActions.slice(0, 10).map((t) => prisma.task.create({ data: { workspaceId: ws, title: t.slice(0, 300), description: `From note: ${note.title}` } })),
  ]);
  return { noteId: note.id, tasks: payload.nextActions.length };
}
