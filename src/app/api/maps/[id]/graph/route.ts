import { prisma } from "@/lib/db";
import { loadOwned, parseBody, requireUser, route } from "@/lib/http";
import { graphSave } from "@/lib/validation";
import { saveGraph } from "@/server/maps";

/** Debounced autosave target for the canvas: full snapshot, diffed server-side. */
export const PUT = route(async (req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id }, select: { id: true, workspaceId: true } }), "EDITOR", "Mind map");
  const body = await parseBody(req, graphSave);
  const result = await saveGraph(map, user.plan, body);
  return { ok: true, ...result, savedAt: new Date().toISOString() };
});
