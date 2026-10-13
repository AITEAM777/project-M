import { prisma } from "@/lib/db";
import { assertSameWorkspace, logActivity, parseBody, route, userAndWorkspace } from "@/lib/http";
import { folderCreate } from "@/lib/validation";

export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const archived = new URL(req.url).searchParams.get("archived") === "1";
  const folders = await prisma.folder.findMany({
    where: { workspaceId, archivedAt: archived ? { not: null } : null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { notes: { where: { archivedAt: null } }, maps: { where: { archivedAt: null } }, projects: { where: { archivedAt: null } }, goals: true, children: true } } },
  });
  return { folders };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const body = await parseBody(req, folderCreate);
  await assertSameWorkspace(workspaceId, { folderId: body.parentId });
  const count = await prisma.folder.count({ where: { workspaceId, parentId: body.parentId ?? null } });
  const folder = await prisma.folder.create({ data: { ...body, workspaceId, position: count } });
  await logActivity(workspaceId, user.id, "created", "folder", folder.id, `Created folder “${folder.name}”`);
  return { folder };
});
