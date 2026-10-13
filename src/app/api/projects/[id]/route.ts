import { prisma } from "@/lib/db";
import { assertSameWorkspace, loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { taskProgress } from "@/lib/progress";
import { projectUpdate } from "@/lib/validation";
import { taskInclude } from "@/server/tasks";

export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const project = await loadOwned(user.id, () => prisma.project.findUnique({
    where: { id: params.id },
    include: {
      goal: { select: { id: true, title: true } },
      folder: { select: { id: true, name: true, icon: true } },
      tasks: { include: taskInclude, orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
      nodes: { select: { id: true, mapId: true, map: { select: { title: true } } } },
    },
  }), "VIEWER", "Project");
  return { project: { ...project, progress: taskProgress(project.tasks) } };
});

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const project = await loadOwned(user.id, () => prisma.project.findUnique({ where: { id: params.id } }), "EDITOR", "Project");
  const { archived, ...body } = await parseBody(req, projectUpdate);
  await assertSameWorkspace(project.workspaceId, { folderId: body.folderId, goalId: body.goalId });
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { ...body, archivedAt: archived === undefined ? undefined : archived ? new Date() : null },
  });
  if (body.status === "COMPLETED" && project.status !== "COMPLETED") await logActivity(project.workspaceId, user.id, "completed", "project", project.id, `Completed project “${project.title}”`);
  return { project: updated };
});

/** Deletes the project. Its tasks are kept (unassigned) unless ?withTasks=1. */
export const DELETE = route(async (req, { params }) => {
  const user = await requireUser();
  const project = await loadOwned(user.id, () => prisma.project.findUnique({ where: { id: params.id } }), "EDITOR", "Project");
  const withTasks = new URL(req.url).searchParams.get("withTasks") === "1";
  await prisma.$transaction([
    ...(withTasks ? [prisma.task.deleteMany({ where: { projectId: project.id } })] : []),
    prisma.project.delete({ where: { id: project.id } }),
  ]);
  await logActivity(project.workspaceId, user.id, "deleted", "project", project.id, `Deleted project “${project.title}”`);
  return { ok: true };
});
