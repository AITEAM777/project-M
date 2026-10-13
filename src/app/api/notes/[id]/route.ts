import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertSameWorkspace, loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { docToText, extractNoteLinks } from "@/lib/richtext";
import { noteUpdate } from "@/lib/validation";

const VERSION_INTERVAL_MS = 10 * 60_000;

export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const note = await loadOwned(user.id, () => prisma.note.findUnique({
    where: { id: params.id },
    include: {
      folder: { select: { id: true, name: true, icon: true } },
      attachments: { orderBy: { createdAt: "desc" } },
      nodes: { select: { id: true, title: true, map: { select: { id: true, title: true } } } },
      linksIn: { select: { source: { select: { id: true, title: true } } } },
      linksOut: { select: { target: { select: { id: true, title: true } } } },
    },
  }), "VIEWER", "Note");
  await prisma.note.update({ where: { id: note.id }, data: { lastOpenedAt: new Date() }, select: { id: true } });
  return { note };
});

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const note = await loadOwned(user.id, () => prisma.note.findUnique({ where: { id: params.id } }), "EDITOR", "Note");
  const { archived, content, ...body } = await parseBody(req, noteUpdate);
  await assertSameWorkspace(note.workspaceId, { folderId: body.folderId });
  const data: Prisma.NoteUpdateInput = {
    ...body,
    folder: body.folderId === undefined ? undefined : body.folderId ? { connect: { id: body.folderId } } : { disconnect: true },
    archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
  };
  delete (data as Record<string, unknown>).folderId;
  if (content !== undefined) {
    data.content = content as Prisma.InputJsonValue;
    data.contentText = docToText(content);
  }
  const updated = await prisma.$transaction(async (tx) => {
    if (content !== undefined) {
      // Snapshot the previous version at most every 10 minutes (version history).
      const last = await tx.noteVersion.findFirst({ where: { noteId: note.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
      if (!last || Date.now() - last.createdAt.getTime() > VERSION_INTERVAL_MS) {
        await tx.noteVersion.create({ data: { noteId: note.id, title: note.title, content: (note.content ?? undefined) as Prisma.InputJsonValue | undefined } });
      }
      // Sync internal [[links]] (only to notes in the same workspace).
      const targets = extractNoteLinks(content).filter((id) => id !== note.id);
      const valid = targets.length
        ? await tx.note.findMany({ where: { id: { in: targets }, workspaceId: note.workspaceId }, select: { id: true } })
        : [];
      await tx.noteLink.deleteMany({ where: { sourceId: note.id } });
      if (valid.length) await tx.noteLink.createMany({ data: valid.map((v) => ({ sourceId: note.id, targetId: v.id })), skipDuplicates: true });
    }
    return tx.note.update({ where: { id: note.id }, data });
  });
  if (archived !== undefined) await logActivity(note.workspaceId, user.id, archived ? "archived" : "restored", "note", note.id, `${archived ? "Archived" : "Restored"} “${note.title}”`);
  return { note: updated };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const note = await loadOwned(user.id, () => prisma.note.findUnique({ where: { id: params.id } }), "EDITOR", "Note");
  await prisma.note.delete({ where: { id: note.id } });
  await logActivity(note.workspaceId, user.id, "deleted", "note", note.id, `Deleted “${note.title}”`);
  return { ok: true };
});
