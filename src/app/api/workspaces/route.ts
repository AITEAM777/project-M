import { prisma } from "@/lib/db";
import { parseBody, requireUser, route } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { limitError } from "@/server/quota";
import { workspaceSchema } from "@/lib/validation";
import { bootstrapWorkspace } from "@/server/bootstrap";

export const GET = route(async () => {
  const user = await requireUser();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  return { workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, workspaceSchema);
  const count = await prisma.workspace.count({ where: { ownerId: user.id } });
  const max = limitsFor(user.plan).workspaces;
  if (count >= max) throw limitError("workspaces", max, "Workspace limit reached for your plan");
  const ws = await prisma.$transaction(async (tx) => {
    const w = await bootstrapWorkspace(tx, user.id, body.name, user.locale);
    return body.icon ? tx.workspace.update({ where: { id: w.id }, data: { icon: body.icon } }) : w;
  });
  return { workspace: { ...ws, role: "OWNER" } };
});
