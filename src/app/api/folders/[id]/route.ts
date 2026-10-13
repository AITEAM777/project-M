import { prisma } from "@/lib/db";
import { HttpError, assertSameWorkspace, loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { folderUpdate } from "@/lib/validation";
import { listGoals } from "@/server/goals";

/** Folder contents: subfolders, notes, maps, projects, goals. */
export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const folder = await loadOwned(user.id, () => prisma.folder.findUnique({ where: { id: params.id } }), "VIEWER", "Folder");
  const live = { folderId: folder.id, archivedAt: null };
  const [children, notes, maps, projects, goals, breadcrumbs] = await Promise.all([
    prisma.folder.findMany({ where: { parentId: folder.id, archivedAt: null }, orderBy: { position: "asc" } }),
    prisma.note.findMany({ where: live, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, kind: true, tags: true, favorite: true, updatedAt: true, contentText: true } }),
    prisma.mindMap.findMany({ where: live, orderBy: { updatedAt: "desc" }, include: { _count: { select: { nodes: true, edges: true } } } }),
    prisma.project.findMany({ where: live, orderBy: { updatedAt: "desc" }, include: { _count: { select: { tasks: true } } } }),
    listGoals(folder.workspaceId, { folderId: folder.id }),
    ancestors(folder.parentId),
  ]);
  return {
    folder,
    breadcrumbs,
    children,
    notes: notes.map((n) => ({ ...n, contentText: n.contentText.slice(0, 160) })),
    maps,
    projects,
    goals,
  };
});

async function ancestors(parentId: string | null) {
  const out: { id: string; name: string; icon: string }[] = [];
  let cur = parentId;
  while (cur && out.length < 20) {
    const f = await prisma.folder.findUnique({ where: { id: cur }, select: { id: true, name: true, icon: true, parentId: true } });
    if (!f) break;
    out.unshift({ id: f.id, name: f.name, icon: f.icon });
    cur = f.parentId;
  }
  return out;
}

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const folder = await loadOwned(user.id, () => prisma.folder.findUnique({ where: { id: params.id } }), "EDITOR", "Folder");
  const { archived, ...body } = await parseBody(req, folderUpdate);
  if (body.parentId !== undefined && body.parentId !== null) {
    await assertSameWorkspace(folder.workspaceId, { folderId: body.parentId });
    // Prevent cycles: the new parent may not be this folder or one of its descendants.
    let cur: string | null = body.parentId;
    while (cur) {
      if (cur === folder.id) throw new HttpError(400, "A folder cannot be moved inside itself");
      const p: { parentId: string | null } | null = await prisma.folder.findUnique({ where: { id: cur }, select: { parentId: true } });
      cur = p?.parentId ?? null;
    }
  }
  const updated = await prisma.folder.update({
    where: { id: folder.id },
    data: { ...body, archivedAt: archived === undefined ? undefined : archived ? new Date() : null },
  });
  return { folder: updated };
});

/** Deletes the folder and subfolders. Items inside are kept and moved to the workspace root. */
export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const folder = await loadOwned(user.id, () => prisma.folder.findUnique({ where: { id: params.id } }), "EDITOR", "Folder");
  const ids = [folder.id];
  for (let i = 0; i < ids.length; i++) {
    const kids = await prisma.folder.findMany({ where: { parentId: ids[i] }, select: { id: true } });
    ids.push(...kids.map((k) => k.id));
  }
  await prisma.$transaction([
    prisma.note.updateMany({ where: { folderId: { in: ids } }, data: { folderId: null } }),
    prisma.mindMap.updateMany({ where: { folderId: { in: ids } }, data: { folderId: null } }),
    prisma.project.updateMany({ where: { folderId: { in: ids } }, data: { folderId: null } }),
    prisma.goal.updateMany({ where: { folderId: { in: ids } }, data: { folderId: null } }),
    prisma.folder.delete({ where: { id: folder.id } }),
  ]);
  await logActivity(folder.workspaceId, user.id, "deleted", "folder", folder.id, `Deleted folder “${folder.name}”`);
  return { ok: true };
});
