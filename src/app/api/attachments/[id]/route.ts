import { prisma } from "@/lib/db";
import { loadOwned, requireUser, route } from "@/lib/http";
import { readStored, removeStored } from "@/server/storage";

/** Auth-checked download. Images render inline; everything else downloads. */
export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const a = await loadOwned(user.id, () => prisma.attachment.findUnique({ where: { id: params.id } }), "VIEWER", "Attachment");
  const data = await readStored(a.storageKey);
  const inline = a.mimeType.startsWith("image/") || a.mimeType === "application/pdf";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(a.filename)}"`,
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "Cache-Control": "private, max-age=3600",
    },
  });
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const a = await loadOwned(user.id, () => prisma.attachment.findUnique({ where: { id: params.id } }), "EDITOR", "Attachment");
  await prisma.attachment.delete({ where: { id: a.id } });
  await removeStored(a.storageKey);
  return { ok: true };
});
