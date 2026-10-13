import { prisma } from "@/lib/db";
import { assertSameWorkspace, logActivity, parseBody, route, userAndWorkspace } from "@/lib/http";
import { goalCreate } from "@/lib/validation";
import { goalInclude, listGoals, serializeGoal } from "@/server/goals";

export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const status = new URL(req.url).searchParams.get("status");
  const goals = await listGoals(workspaceId, status === "active" ? { status: { in: ["ACTIVE", "NOT_STARTED"] } } : {});
  return { goals };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const { milestones, ...body } = await parseBody(req, goalCreate);
  await assertSameWorkspace(workspaceId, { folderId: body.folderId });
  const goal = await prisma.goal.create({
    data: {
      ...body,
      workspaceId,
      milestones: milestones?.length ? { create: milestones.map((title, position) => ({ title, position })) } : undefined,
    },
    include: goalInclude,
  });
  await logActivity(workspaceId, user.id, "created", "goal", goal.id, `Set goal “${goal.title}”`);
  return { goal: serializeGoal(goal) };
});
