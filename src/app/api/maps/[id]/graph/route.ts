import { prisma } from "@/lib/db";
import { HttpError, loadOwned, parseBody, requireUser, route } from "@/lib/http";
import { graphSave } from "@/lib/validation";
import { saveGraph } from "@/server/maps";

/**
 * Debounced autosave target for the canvas: full snapshot, diffed server-side.
 * When the client sends the revision it edited from, the save only goes through if nobody
 * (another tab, device or teammate) saved in between — otherwise 409 instead of silently
 * overwriting their work.
 */
export const PUT = route(async (req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id }, select: { id: true, workspaceId: true, revision: true } }), "EDITOR", "Mind map");
  const { baseRevision, ...body } = await parseBody(req, graphSave);
  // Claim the next revision atomically: of two concurrent saves from the same base, one wins.
  const claimed = await prisma.mindMap.updateMany({
    where: { id: map.id, ...(baseRevision === undefined ? {} : { revision: baseRevision }) },
    data: { revision: { increment: 1 } },
  });
  if (!claimed.count) {
    const now = await prisma.mindMap.findUnique({ where: { id: map.id }, select: { revision: true } });
    throw new HttpError(409, "This map was changed in another window", { conflict: true, revision: now?.revision ?? map.revision });
  }
  const revision = (baseRevision ?? map.revision) + 1;
  try {
    const result = await saveGraph(map, user.plan, body);
    return { ok: true, ...result, revision, savedAt: new Date().toISOString() };
  } catch (e) {
    // Nothing was written — give the revision back so the editor isn't pushed into a false conflict.
    await prisma.mindMap.updateMany({ where: { id: map.id, revision }, data: { revision: { decrement: 1 } } }).catch(() => {});
    throw e;
  }
});
