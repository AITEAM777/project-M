import { prisma } from "@/lib/db";
import { assertSameWorkspace, logActivity, parseBody, route, userAndWorkspace } from "@/lib/http";
import { taskProgress } from "@/lib/progress";
import { projectCreate } from "@/lib/validation";
import { assertQuota } from "@/server/quota";

export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const projects = await prisma.project.findMany({
    where: { workspaceId, archivedAt: sp.get("archived") === "1" ? { not: null } : null, ...(sp.get("goal") ? { goalId: sp.get("goal") } : {}) },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    include: {
      goal: { select: { id: true, title: true } },
      folder: { select: { id: true, name: true, icon: true } },
      tasks: { select: { status: true, dueDate: true } },
    },
  });
  const now = new Date();
  return {
    projects: projects.map(({ tasks, ...p }) => ({
      ...p,
      progress: taskProgress(tasks),
      overdue: tasks.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate < now).length,
    })),
  };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const body = await parseBody(req, projectCreate);
  await assertQuota("projects", workspaceId, user.plan);
  await assertSameWorkspace(workspaceId, { folderId: body.folderId, goalId: body.goalId });
  const project = await prisma.project.create({ data: { ...body, workspaceId } });
  await logActivity(workspaceId, user.id, "created", "project", project.id, `Created project “${project.title}”`);
  return { project };
});
