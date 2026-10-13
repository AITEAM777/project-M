import { rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { destroySession, verifyPassword } from "@/lib/auth";
import { HttpError, parseBody, requireUser, route } from "@/lib/http";
import { accountDelete } from "@/lib/validation";
import { uploadDir } from "@/server/storage";

/** Permanently deletes the account, owned workspaces (cascade) and stored files. */
export const DELETE = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, accountDelete);
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(body.password, u.passwordHash))) throw new HttpError(400, "Password is incorrect");
  const owned = await prisma.workspace.findMany({ where: { ownerId: user.id }, select: { id: true } });
  const files = await prisma.attachment.findMany({ where: { workspaceId: { in: owned.map((w) => w.id) } }, select: { storageKey: true } });
  await destroySession();
  await prisma.user.delete({ where: { id: user.id } });
  await Promise.all(files.map((f) => rm(path.join(uploadDir(), f.storageKey), { force: true })));
  return { ok: true };
});
