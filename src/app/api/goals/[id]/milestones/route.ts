import { prisma } from "@/lib/db";
import { loadOwned, parseBody, requireUser, route } from "@/lib/http";
import { milestoneCreate } from "@/lib/validation";

export const POST = route(async (req, { params }) => {
  const user = await requireUser();
  const goal = await loadOwned(user.id, () => prisma.goal.findUnique({ where: { id: params.id } }), "EDITOR", "Goal");
  const body = await parseBody(req, milestoneCreate);
  const position = await prisma.milestone.count({ where: { goalId: goal.id } });
  return { milestone: await prisma.milestone.create({ data: { ...body, goalId: goal.id, position } }) };
});
