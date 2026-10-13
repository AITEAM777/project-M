import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, logActivity, notFound, parseBody, requireMember, requireUser, route } from "@/lib/http";
import { applySuggestion } from "@/server/ai-apply";

const body = z.object({
  action: z.enum(["accept", "dismiss"]),
  /** Indices of the items the user selected (connections / plan goals); default all. */
  selected: z.array(z.number().int().min(0)).max(200).optional(),
  includeSchedule: z.boolean().optional(),
  tzo: z.number().int().min(-900).max(900).optional(),
});

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const s = await prisma.aiSuggestion.findUnique({ where: { id: params.id } });
  if (!s || s.userId !== user.id) throw notFound("Suggestion");
  await requireMember(user.id, s.workspaceId, "EDITOR");
  if (s.status !== "PENDING") throw new HttpError(409, "This suggestion was already handled");
  const b = await parseBody(req, body);
  let result: unknown = null;
  if (b.action === "accept") {
    result = await applySuggestion(s, user.id, { selected: b.selected, includeSchedule: b.includeSchedule ?? true, tzo: b.tzo ?? 0 });
    await logActivity(s.workspaceId, user.id, "accepted", "ai", s.id, `Accepted AI suggestion: ${s.kind}`);
  }
  const suggestion = await prisma.aiSuggestion.update({
    where: { id: s.id },
    data: { status: b.action === "accept" ? "ACCEPTED" : "DISMISSED", resolvedAt: new Date() },
  });
  return { suggestion, result };
});
