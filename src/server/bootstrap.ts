import "server-only";
import type { Prisma } from "@prisma/client";
import { textToDoc } from "@/lib/richtext";

export const DEFAULT_FOLDERS: { name: string; icon: string; color: string }[] = [
  { name: "Health & Fitness", icon: "💪", color: "#10b981" },
  { name: "Personal Finance", icon: "💰", color: "#f59e0b" },
  { name: "Education", icon: "📚", color: "#3b82f6" },
  { name: "Business & Startups", icon: "🚀", color: "#8b5cf6" },
  { name: "Career", icon: "💼", color: "#0ea5e9" },
  { name: "Personal Development", icon: "🌱", color: "#22c55e" },
  { name: "Relationships", icon: "❤️", color: "#ec4899" },
  { name: "Creative Ideas", icon: "🎨", color: "#f97316" },
];

/** Creates the default "My Life" workspace with starter folders and a welcome note. */
export async function bootstrapWorkspace(tx: Prisma.TransactionClient, userId: string, name = "My Life") {
  const ws = await tx.workspace.create({
    data: { name, ownerId: userId, members: { create: { userId, role: "OWNER" } } },
  });
  await tx.folder.createMany({
    data: DEFAULT_FOLDERS.map((f, i) => ({ ...f, workspaceId: ws.id, position: i })),
  });
  await tx.note.create({
    data: {
      workspaceId: ws.id,
      createdById: userId,
      title: "Welcome to Nodera",
      content: textToDoc(
        "Nodera turns scattered thoughts into connected ideas, connected ideas into plans, and plans into measurable progress.\n" +
          "Try this: capture a thought with the ⚡ button (or press Q), open Mind Maps and double-click the canvas to add nodes, drag from one node's edge to another to connect them, then convert a node into a task and link it to a goal.",
      ) as Prisma.InputJsonValue,
      contentText:
        "Nodera turns scattered thoughts into connected ideas, connected ideas into plans, and plans into measurable progress.",
    },
  });
  return ws;
}
