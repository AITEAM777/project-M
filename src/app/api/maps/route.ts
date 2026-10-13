import { prisma } from "@/lib/db";
import { assertSameWorkspace, logActivity, parseBody, route, userAndWorkspace } from "@/lib/http";
import { uid } from "@/lib/utils";
import { mapCreate } from "@/lib/validation";
import { assertMapQuota } from "@/server/maps";
import { templatesFor } from "@/server/templates";

export const GET = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const maps = await prisma.mindMap.findMany({
    where: {
      workspaceId,
      archivedAt: sp.get("archived") === "1" ? { not: null } : null,
      ...(sp.get("folder") ? { folderId: sp.get("folder") } : {}),
    },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    include: { folder: { select: { id: true, name: true, icon: true } }, _count: { select: { nodes: true, edges: true } } },
  });
  return { maps, templates: templatesFor(user.locale).map(({ id, name, description }) => ({ id, name, description })) };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const body = await parseBody(req, mapCreate);
  await assertSameWorkspace(workspaceId, { folderId: body.folderId });
  await assertMapQuota(workspaceId, user.plan);
  const loc = body.locale ?? user.locale;
  const tpl = templatesFor(loc).find((t) => t.id === body.template);
  const map = await prisma.$transaction(async (tx) => {
    const m = await tx.mindMap.create({
      data: { workspaceId, folderId: body.folderId ?? null, title: body.title?.trim() || tpl?.name || (loc === "uk" ? "Нова карта" : "Untitled map"), description: body.description ?? tpl?.description ?? "" },
    });
    if (tpl) {
      const ids = new Map(tpl.nodes.map((n) => [n.key, uid("n_")]));
      await tx.mapNode.createMany({
        data: tpl.nodes.map((n) => ({
          id: ids.get(n.key)!, mapId: m.id, kind: n.kind as never, title: n.title, x: n.x, y: n.y,
          color: n.color ?? "", icon: n.icon ?? "", description: n.description ?? "",
        })),
      });
      await tx.mapEdge.createMany({
        data: tpl.edges.map((e) => ({
          id: uid("e_"), mapId: m.id, sourceId: ids.get(e.from)!, targetId: ids.get(e.to)!, relation: e.relation as never, label: e.label ?? "",
        })),
      });
    } else {
      await tx.mapNode.create({ data: { id: uid("n_"), mapId: m.id, kind: "THOUGHT", title: m.title, x: 0, y: 0, color: "#6366f1" } });
    }
    return m;
  });
  await logActivity(workspaceId, user.id, "created", "map", map.id, `Created mind map “${map.title}”`);
  return { map };
});
