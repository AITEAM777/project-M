import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, assertSameWorkspace, loadOwned, logActivity, notFound, parseBody, requireUser, route } from "@/lib/http";
import { textToDoc } from "@/lib/richtext";
import { nodeConvert } from "@/lib/validation";

/**
 * Converts a canvas node into a canonical entity (task, note, goal, project, habit)
 * and links the node to it. The node stays on the canvas; nothing is duplicated.
 */
export const POST = route(async (req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id }, select: { id: true, workspaceId: true } }), "EDITOR", "Mind map");
  const node = await prisma.mapNode.findFirst({ where: { id: params.nodeId, mapId: map.id } });
  if (!node) throw notFound("Node (save the map first)");
  const body = await parseBody(req, nodeConvert);
  await assertSameWorkspace(map.workspaceId, { projectId: body.projectId, goalId: body.goalId });
  const ws = map.workspaceId;
  const title = node.title.trim() || "Untitled";
  const description = node.description;

  const result = await prisma.$transaction(async (tx) => {
    let data: Prisma.MapNodeUpdateInput;
    let entity: { id: string; title: string };
    switch (body.to) {
      case "TASK": {
        if (node.taskId) throw new HttpError(409, "Node is already a task");
        entity = await tx.task.create({ data: { workspaceId: ws, title, description, projectId: body.projectId ?? null, goalId: body.goalId ?? null, tags: node.tags } });
        data = { task: { connect: { id: entity.id } }, kind: "TASK" };
        break;
      }
      case "NOTE": {
        if (node.noteId) throw new HttpError(409, "Node already has a note");
        entity = await tx.note.create({
          data: { workspaceId: ws, title, kind: "NOTE", content: textToDoc(description) as Prisma.InputJsonValue, contentText: description, tags: node.tags, createdById: user.id },
        });
        data = { note: { connect: { id: entity.id } } };
        break;
      }
      case "GOAL": {
        if (node.goalId) throw new HttpError(409, "Node is already a goal");
        entity = await tx.goal.create({ data: { workspaceId: ws, title, description } });
        data = { goal: { connect: { id: entity.id } }, kind: "GOAL" };
        break;
      }
      case "PROJECT": {
        if (node.projectId) throw new HttpError(409, "Node is already a project");
        entity = await tx.project.create({ data: { workspaceId: ws, title, description, goalId: body.goalId ?? node.goalId ?? null } });
        data = { project: { connect: { id: entity.id } }, kind: "PROJECT" };
        break;
      }
      case "HABIT": {
        if (node.habitId) throw new HttpError(409, "Node is already a habit");
        entity = await tx.habit.create({ data: { workspaceId: ws, title, description, goalId: body.goalId ?? null } });
        data = { habit: { connect: { id: entity.id } }, kind: "HABIT" };
        break;
      }
    }
    await tx.mapNode.update({ where: { id: node.id }, data });
    return entity;
  });
  await logActivity(ws, user.id, "converted", body.to.toLowerCase(), result.id, `Turned “${title}” into a ${body.to.toLowerCase()}`);
  return { entity: result, to: body.to };
});
