import { prisma } from "@/lib/db";
import { HttpError, parseBody, requireMember, requireUser, route } from "@/lib/http";
import { workspaceSchema } from "@/lib/validation";

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  await requireMember(user.id, params.id, "OWNER");
  const body = await parseBody(req, workspaceSchema.partial());
  return { workspace: await prisma.workspace.update({ where: { id: params.id }, data: body }) };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  await requireMember(user.id, params.id, "OWNER");
  const count = await prisma.workspaceMember.count({ where: { userId: user.id } });
  if (count <= 1) throw new HttpError(400, "You cannot delete your only workspace");
  await prisma.workspace.delete({ where: { id: params.id } });
  return { ok: true };
});
