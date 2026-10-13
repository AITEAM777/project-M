import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, loadOwned, localRanges, parseBody, route, userAndWorkspace } from "@/lib/http";
import { habitStats } from "@/lib/habits";
import { assertAiAllowed, generate } from "@/server/ai";
import { breakdownSchema, connectionsSchema, organizeSchema, planSchema, reflectionSchema, summarySchema } from "@/server/ai-schemas";

const body = z.object({
  input: z.string().max(5000).optional(),
  goalId: z.string().optional(),
  noteId: z.string().optional(),
  mapId: z.string().optional(),
  availability: z.string().max(1000).optional(),
});

/**
 * AI actions. Each returns a stored PENDING suggestion; nothing in the workspace
 * changes until the user accepts it via /api/ai/suggestions/[id].
 * Only data from the requested workspace is sent to the model.
 */
export const POST = route(async (req, { params }) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  await assertAiAllowed(user);
  const b = await parseBody(req, body);
  let payload: unknown;
  let input = b.input ?? "";

  switch (params.action) {
    case "plan": {
      if (!b.input?.trim()) throw new HttpError(400, "Describe what you want to achieve");
      const goals = await prisma.goal.findMany({ where: { workspaceId, status: { in: ["ACTIVE", "NOT_STARTED"] } }, select: { title: true } });
      payload = await generate(planSchema, [
        `The user wrote:\n"""${b.input}"""`,
        b.availability ? `Their availability: ${b.availability}` : "Availability not given — propose modest time blocks (mornings/evenings) and keep the total realistic (under ~8h/week of new commitments).",
        goals.length ? `Existing active goals (avoid duplicating them): ${goals.map((g) => g.title).join("; ")}` : "",
        "Propose a structured plan: goals with milestones, first tasks and supporting habits; meaningful connections between the goals; and a weekly schedule. Do not double-book time slots.",
      ].filter(Boolean).join("\n\n"), { effort: "medium" });
      break;
    }
    case "connections": {
      const [goals, projects, notes, habits] = await Promise.all([
        prisma.goal.findMany({ where: { workspaceId, status: { not: "ABANDONED" } }, select: { id: true, title: true, description: true, category: true }, take: 60 }),
        prisma.project.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, title: true, description: true, goalId: true }, take: 60 }),
        prisma.note.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, title: true, contentText: true }, orderBy: { updatedAt: "desc" }, take: 60 }),
        prisma.habit.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, title: true, goalId: true }, take: 40 }),
      ]);
      const items = [
        ...goals.map((g) => `goal:${g.id} | ${g.title} | ${g.category} ${g.description.slice(0, 120)}`),
        ...projects.map((p) => `project:${p.id} | ${p.title} | ${p.description.slice(0, 120)}${p.goalId ? ` (already supports goal:${p.goalId})` : ""}`),
        ...habits.map((h) => `habit:${h.id} | ${h.title}${h.goalId ? ` (already supports goal:${h.goalId})` : ""}`),
        ...notes.map((n) => `note:${n.id} | ${n.title} | ${n.contentText.slice(0, 160).replace(/\s+/g, " ")}`),
      ];
      if (items.length < 2) throw new HttpError(400, "Add a few goals, projects or notes first");
      const result = await generate(connectionsSchema, `Items in the user's workspace (ref | title | details):\n${items.join("\n")}\n\nSuggest up to 10 useful, non-obvious connections between different items that are NOT already linked. Use refs exactly as given.`, { effort: "medium" });
      const valid = new Set(items.map((i) => i.split(" | ")[0]));
      payload = { suggestions: result.suggestions.filter((s) => valid.has(s.sourceRef) && valid.has(s.targetRef) && s.sourceRef !== s.targetRef) };
      input = "Discover connections";
      break;
    }
    case "breakdown": {
      if (!b.goalId) throw new HttpError(400, "goalId is required");
      const goal = await loadOwned(user.id, () => prisma.goal.findUnique({ where: { id: b.goalId }, include: { milestones: true, tasks: { select: { title: true, status: true } } } }), "EDITOR", "Goal");
      if (goal.workspaceId !== workspaceId) throw new HttpError(400, "Goal is in another workspace");
      payload = await generate(breakdownSchema, [
        `Goal: ${goal.title}`,
        goal.description && `Description: ${goal.description}`,
        goal.successCriteria && `Success criteria: ${goal.successCriteria}`,
        goal.targetDate && `Target date: ${goal.targetDate.toISOString().slice(0, 10)}`,
        goal.milestones.length && `Existing milestones: ${goal.milestones.map((m) => m.title).join("; ")}`,
        goal.tasks.length && `Existing tasks: ${goal.tasks.map((t) => t.title).join("; ")}`,
        "Break this goal into 3-6 NEW milestones (not duplicating existing ones), each with 2-5 small actionable tasks and realistic time estimates in minutes.",
      ].filter(Boolean).join("\n"), { effort: "medium" });
      payload = { ...(payload as object), goalId: goal.id };
      input = goal.title;
      break;
    }
    case "organize": {
      if (!b.noteId) throw new HttpError(400, "noteId is required");
      const note = await loadOwned(user.id, () => prisma.note.findUnique({ where: { id: b.noteId } }), "EDITOR", "Note");
      if (note.workspaceId !== workspaceId) throw new HttpError(400, "Note is in another workspace");
      const [folders, others, goals] = await Promise.all([
        prisma.folder.findMany({ where: { workspaceId, archivedAt: null }, select: { id: true, name: true } }),
        prisma.note.findMany({ where: { workspaceId, archivedAt: null, id: { not: note.id } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 80 }),
        prisma.goal.findMany({ where: { workspaceId }, select: { id: true, title: true }, take: 40 }),
      ]);
      const result = await generate(organizeSchema, [
        `Note title: ${note.title}`,
        `Note content:\n"""${note.contentText.slice(0, 6000)}"""`,
        `Existing tags: ${note.tags.join(", ") || "none"}`,
        `Folders (id | name):\n${folders.map((f) => `${f.id} | ${f.name}`).join("\n")}`,
        `Other items (ref | title):\n${[...others.map((o) => `note:${o.id} | ${o.title}`), ...goals.map((g) => `goal:${g.id} | ${g.title}`)].join("\n")}`,
        "Suggest a title, tags, the best folder, related items (refs exactly as given) and any next actions hidden in the note.",
      ].join("\n\n"), { effort: "low" });
      const fids = new Set(folders.map((f) => f.id));
      const refs = new Set([...others.map((o) => `note:${o.id}`), ...goals.map((g) => `goal:${g.id}`)]);
      payload = { ...result, folderId: result.folderId && fids.has(result.folderId) ? result.folderId : null, relatedRefs: result.relatedRefs.filter((r) => refs.has(r)), noteId: note.id };
      input = note.title;
      break;
    }
    case "summarize": {
      if (!b.mapId) throw new HttpError(400, "mapId is required");
      const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: b.mapId }, include: { nodes: { select: { id: true, title: true, kind: true, description: true } }, edges: true } }), "VIEWER", "Mind map");
      if (map.workspaceId !== workspaceId) throw new HttpError(400, "Map is in another workspace");
      const t = new Map(map.nodes.map((n) => [n.id, n.title]));
      payload = await generate(summarySchema, [
        `Mind map: ${map.title}`,
        `Nodes:\n${map.nodes.slice(0, 400).map((n) => `- [${n.kind}] ${n.title}${n.description ? `: ${n.description.slice(0, 160)}` : ""}`).join("\n")}`,
        `Connections:\n${map.edges.slice(0, 600).map((e) => `- ${t.get(e.sourceId)} ${e.relation} ${t.get(e.targetId)}${e.label ? ` (${e.label})` : ""}`).join("\n")}`,
        "Summarize what this map is about, its key themes, open questions and the most valuable next steps.",
      ].join("\n\n"), { effort: "low" });
      input = map.title;
      break;
    }
    case "reflect": {
      const r = localRanges(req);
      const since = new Date(r.todayStart.getTime() - 6 * 86400_000);
      const [done, open, overdue, notes, habits, goals] = await Promise.all([
        prisma.task.findMany({ where: { workspaceId, completedAt: { gte: since } }, select: { title: true } }),
        prisma.task.findMany({ where: { workspaceId, status: { not: "DONE" }, dueDate: { gte: since, lte: r.todayEnd } }, select: { title: true } }),
        prisma.task.count({ where: { workspaceId, status: { not: "DONE" }, dueDate: { lt: since } } }),
        prisma.note.findMany({ where: { workspaceId, createdAt: { gte: since } }, select: { title: true, kind: true } }),
        prisma.habit.findMany({ where: { workspaceId, archivedAt: null }, include: { logs: { where: { date: { gte: new Date(since.getTime() - 30 * 86400_000) } } } } }),
        prisma.goal.findMany({ where: { workspaceId, status: "ACTIVE" }, select: { title: true } }),
      ]);
      const habitLines = habits.map((h) => {
        const s = habitStats(h, Object.fromEntries(h.logs.map((l) => [l.date.toISOString().slice(0, 10), l.count])));
        return `${h.title}: ${s.rate7}% of the last 7 days, streak ${s.streak}`;
      });
      payload = await generate(reflectionSchema, [
        "Write a weekly reflection strictly from this data from the last 7 days. If there is little data, say so honestly — do not invent achievements.",
        `Completed tasks (${done.length}): ${done.map((d) => d.title).join("; ") || "none"}`,
        `Due this week but not done (${open.length}): ${open.map((d) => d.title).join("; ") || "none"}`,
        `Older overdue tasks: ${overdue}`,
        `Thoughts/notes captured (${notes.length}): ${notes.map((n) => n.title).join("; ") || "none"}`,
        `Habits: ${habitLines.join("; ") || "none"}`,
        `Active goals: ${goals.map((g) => g.title).join("; ") || "none"}`,
      ].join("\n"), { effort: "low" });
      input = "Weekly reflection";
      break;
    }
    default:
      throw new HttpError(404, "Unknown AI action");
  }

  const suggestion = await prisma.aiSuggestion.create({
    data: { workspaceId, userId: user.id, kind: params.action, input: input.slice(0, 5000), payload: payload as Prisma.InputJsonValue },
  });
  return { suggestion };
});
