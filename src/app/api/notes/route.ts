import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertSameWorkspace, logActivity, parseBody, route, userAndWorkspace } from "@/lib/http";
import { docToText, textToDoc } from "@/lib/richtext";
import { noteCreate } from "@/lib/validation";

export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const where: Prisma.NoteWhereInput = { workspaceId, archivedAt: sp.get("archived") === "1" ? { not: null } : null };
  const kind = sp.get("kind");
  if (kind === "NOTE" || kind === "THOUGHT") where.kind = kind;
  if (sp.get("folder")) where.folderId = sp.get("folder") === "none" ? null : sp.get("folder");
  if (sp.get("tag")) where.tags = { has: sp.get("tag")! };
  if (sp.get("favorite") === "1") where.favorite = true;
  const q = sp.get("q")?.trim();
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { contentText: { contains: q, mode: "insensitive" } }];
  const take = Math.min(Number(sp.get("limit") || 200), 500);
  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    take,
    select: {
      id: true, title: true, kind: true, tags: true, favorite: true, folderId: true, createdAt: true, updatedAt: true, archivedAt: true, contentText: true,
      folder: { select: { id: true, name: true, icon: true } },
      _count: { select: { nodes: true, linksIn: true } },
    },
  });
  return { notes: notes.map((n) => ({ ...n, contentText: n.contentText.slice(0, 240) })) };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const body = await parseBody(req, noteCreate);
  await assertSameWorkspace(workspaceId, { folderId: body.folderId });
  const content = body.content ?? (body.text ? textToDoc(body.text) : textToDoc(""));
  let title = body.title?.trim();
  if (!title) title = body.text?.trim().split("\n")[0].slice(0, 80) || (body.kind === "THOUGHT" ? "New thought" : "Untitled");
  const note = await prisma.note.create({
    data: {
      workspaceId,
      folderId: body.folderId ?? null,
      kind: body.kind ?? "NOTE",
      title,
      content: content as Prisma.InputJsonValue,
      contentText: docToText(content),
      tags: body.tags ?? [],
      createdById: user.id,
    },
  });
  await logActivity(workspaceId, user.id, "created", note.kind === "THOUGHT" ? "thought" : "note", note.id, `Captured “${note.title}”`);
  return { note };
});
