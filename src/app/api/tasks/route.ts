import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertSameWorkspace, localRanges, logActivity, parseBody, route, userAndWorkspace } from "@/lib/http";
import { taskCreate } from "@/lib/validation";
import { taskInclude } from "@/server/tasks";

export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const where: Prisma.TaskWhereInput = { workspaceId };
  const status = sp.get("status");
  if (status === "open") where.status = { not: "DONE" };
  else if (status === "TODO" || status === "IN_PROGRESS" || status === "DONE") where.status = status;
  if (sp.get("project")) where.projectId = sp.get("project") === "none" ? null : sp.get("project");
  if (sp.get("goal")) where.goalId = sp.get("goal");
  if (sp.get("tag")) where.tags = { has: sp.get("tag")! };
  const r = localRanges(req);
  switch (sp.get("due")) {
    case "today":
      where.OR = [
        { dueDate: { lte: r.todayEnd }, status: { not: "DONE" } },
        { scheduledStart: { gte: r.todayStart, lte: r.todayEnd } },
        { completedAt: { gte: r.todayStart } },
      ];
      break;
    case "overdue":
      where.dueDate = { lt: r.todayStart };
      where.status = { not: "DONE" };
      break;
    case "week":
      where.dueDate = { gte: r.todayStart, lte: r.weekEnd };
      break;
    case "upcoming":
      where.dueDate = { gte: r.todayStart };
      break;
    case "unscheduled":
      where.dueDate = null;
      where.scheduledStart = null;
      break;
  }
  const q = sp.get("q")?.trim();
  if (q) where.title = { contains: q, mode: "insensitive" };
  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { position: "asc" }, { createdAt: "desc" }],
    take: Math.min(Number(sp.get("limit") || 500), 1000),
  });
  return { tasks };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const body = await parseBody(req, taskCreate);
  await assertSameWorkspace(workspaceId, { projectId: body.projectId, goalId: body.goalId, milestoneId: body.milestoneId });
  const position = await prisma.task.count({ where: { workspaceId, projectId: body.projectId ?? null } });
  const task = await prisma.task.create({
    data: { ...body, workspaceId, position, completedAt: body.status === "DONE" ? new Date() : null },
    include: taskInclude,
  });
  await logActivity(workspaceId, user.id, "created", "task", task.id, `Added task “${task.title}”`);
  return { task };
});
