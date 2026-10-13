import { prisma } from "@/lib/db";
import { route, userAndWorkspace } from "@/lib/http";

export const GET = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req);
  const suggestions = await prisma.aiSuggestion.findMany({ where: { workspaceId, userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 });
  return { suggestions };
});
