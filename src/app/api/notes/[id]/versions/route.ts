import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { loadOwned, notFound, parseBody, requireUser, route } from "@/lib/http";
import { docToText } from "@/lib/richtext";

export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const note = await loadOwned(user.id, () => prisma.note.findUnique({ where: { id: params.id } }), "VIEWER", "Note");
  const versions = await prisma.noteVersion.findMany({ where: { noteId: note.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return { versions };
});

/** Restores a previous version (the current content is snapshotted first, so restore is reversible). */
export const POST = route(async (req, { params }) => {
  const user = await requireUser();
  const note = await loadOwned(user.id, () => prisma.note.findUnique({ where: { id: params.id } }), "EDITOR", "Note");
  const { versionId } = await parseBody(req, z.object({ versionId: z.string() }));
  const v = await prisma.noteVersion.findFirst({ where: { id: versionId, noteId: note.id } });
  if (!v) throw notFound("Version");
  const [, updated] = await prisma.$transaction([
    prisma.noteVersion.create({ data: { noteId: note.id, title: note.title, content: (note.content ?? undefined) as Prisma.InputJsonValue | undefined } }),
    prisma.note.update({ where: { id: note.id }, data: { title: v.title, content: (v.content ?? undefined) as Prisma.InputJsonValue | undefined, contentText: docToText(v.content) } }),
  ]);
  return { note: updated };
});
