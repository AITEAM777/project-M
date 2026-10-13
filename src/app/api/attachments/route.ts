import { prisma } from "@/lib/db";
import { HttpError, notFound, requireMember, requireUser, route } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { removeStored, saveFile } from "@/server/storage";

/** Multipart upload: fields `file`, `ws`, and one of `noteId` / `nodeId`. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  const ws = String(form.get("ws") ?? "");
  const noteId = (form.get("noteId") as string) || null;
  const nodeId = (form.get("nodeId") as string) || null;
  if (!(file instanceof File)) throw new HttpError(400, "No file");
  await requireMember(user.id, ws, "EDITOR");
  if (noteId && !(await prisma.note.findFirst({ where: { id: noteId, workspaceId: ws }, select: { id: true } }))) throw notFound("Note");
  if (nodeId && !(await prisma.mapNode.findFirst({ where: { id: nodeId, map: { workspaceId: ws } }, select: { id: true } }))) throw notFound("Node (save the map first)");
  const used = await prisma.attachment.aggregate({ where: { workspace: { ownerId: user.id } }, _sum: { size: true } });
  if ((used._sum.size ?? 0) + file.size > limitsFor(user.plan).storageBytes) throw new HttpError(402, "Storage limit reached for your plan");
  const key = await saveFile(file);
  try {
    const attachment = await prisma.attachment.create({
      data: { workspaceId: ws, noteId, nodeId, filename: file.name.slice(0, 200), mimeType: file.type, size: file.size, storageKey: key },
    });
    return { attachment, url: `/api/attachments/${attachment.id}` };
  } catch (e) {
    await removeStored(key);
    throw e;
  }
});

export const GET = route(async (req) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const ws = sp.get("ws");
  await requireMember(user.id, ws, "VIEWER");
  const attachments = await prisma.attachment.findMany({
    where: { workspaceId: ws!, ...(sp.get("noteId") ? { noteId: sp.get("noteId") } : {}), ...(sp.get("nodeId") ? { nodeId: sp.get("nodeId") } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return { attachments };
});
