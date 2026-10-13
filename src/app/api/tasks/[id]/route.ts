import { prisma } from "@/lib/db";
import { HttpError, assertSameWorkspace, loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { taskUpdate } from "@/lib/validation";
import { nextOccurrence, taskInclude } from "@/server/tasks";

export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const task = await loadOwned(user.id, () => prisma.task.findUnique({
    where: { id: params.id },
    include: { ...taskInclude, dependents: { select: { task: { select: { id: true, title: true, status: true } } } }, events: { select: { id: true, start: true, end: true } } },
  }), "VIEWER", "Task");
  return { task };
});

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const task = await loadOwned(user.id, () => prisma.task.findUnique({ where: { id: params.id } }), "EDITOR", "Task");
  const { dependsOn, ...body } = await parseBody(req, taskUpdate);
  await assertSameWorkspace(task.workspaceId, { projectId: body.projectId, goalId: body.goalId, milestoneId: body.milestoneId });
  if (dependsOn) {
    if (dependsOn.includes(task.id)) throw new HttpError(400, "A task cannot depend on itself");
    const n = await prisma.task.count({ where: { id: { in: dependsOn }, workspaceId: task.workspaceId } });
    if (n !== dependsOn.length) throw new HttpError(400, "Invalid task dependency");
  }
  const completing = body.status === "DONE" && task.status !== "DONE";
  const reopening = body.status && body.status !== "DONE" && task.status === "DONE";
  const updated = await prisma.$transaction(async (tx) => {
    if (dependsOn) {
      await tx.taskDependency.deleteMany({ where: { taskId: task.id } });
      if (dependsOn.length) await tx.taskDependency.createMany({ data: dependsOn.map((d) => ({ taskId: task.id, dependsOnId: d })) });
    }
    const t = await tx.task.update({
      where: { id: task.id },
      data: { ...body, completedAt: completing ? new Date() : reopening ? null : undefined },
      include: taskInclude,
    });
    // Recurring task: completing it schedules the next occurrence.
    if (completing && t.recurrence !== "NONE") {
      const base = t.dueDate ?? t.scheduledStart ?? new Date();
      const next = nextOccurrence(base, t.recurrence);
      const shift = next ? next.getTime() - base.getTime() : 0;
      if (next) {
        await tx.task.create({
          data: {
            workspaceId: t.workspaceId, projectId: t.projectId, goalId: t.goalId, milestoneId: t.milestoneId, title: t.title,
            description: t.description, priority: t.priority, tags: t.tags, recurrence: t.recurrence, estimateMinutes: t.estimateMinutes,
            dueDate: t.dueDate ? new Date(t.dueDate.getTime() + shift) : null,
            scheduledStart: t.scheduledStart ? new Date(t.scheduledStart.getTime() + shift) : null,
            scheduledEnd: t.scheduledEnd ? new Date(t.scheduledEnd.getTime() + shift) : null,
          },
        });
      }
    }
    return t;
  });
  if (completing) await logActivity(task.workspaceId, user.id, "completed", "task", task.id, `Completed “${task.title}”`);
  return { task: updated };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const task = await loadOwned(user.id, () => prisma.task.findUnique({ where: { id: params.id } }), "EDITOR", "Task");
  await prisma.task.delete({ where: { id: task.id } });
  await logActivity(task.workspaceId, user.id, "deleted", "task", task.id, `Deleted task “${task.title}”`);
  return { ok: true };
});
