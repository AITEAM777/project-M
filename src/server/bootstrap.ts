import "server-only";
import type { Prisma } from "@prisma/client";
import { textToDoc } from "@/lib/richtext";

type Loc = "en" | "uk" | string;

const FOLDERS: { en: string; uk: string; icon: string; color: string }[] = [
  { en: "Health & Fitness", uk: "Здоров'я та спорт", icon: "💪", color: "#10b981" },
  { en: "Personal Finance", uk: "Особисті фінанси", icon: "💰", color: "#f59e0b" },
  { en: "Education", uk: "Навчання", icon: "📚", color: "#3b82f6" },
  { en: "Business & Startups", uk: "Бізнес і стартапи", icon: "🚀", color: "#8b5cf6" },
  { en: "Career", uk: "Кар'єра", icon: "💼", color: "#0ea5e9" },
  { en: "Personal Development", uk: "Саморозвиток", icon: "🌱", color: "#22c55e" },
  { en: "Relationships", uk: "Стосунки", icon: "❤️", color: "#ec4899" },
  { en: "Creative Ideas", uk: "Творчі ідеї", icon: "🎨", color: "#f97316" },
];
export const DEFAULT_FOLDERS = FOLDERS.map((f) => ({ name: f.en, icon: f.icon, color: f.color }));

const WELCOME = {
  en: {
    workspace: "My Life",
    title: "Welcome to Nodera",
    intro: "Nodera turns scattered thoughts into connected ideas, connected ideas into plans, and plans into measurable progress.",
    body: "Try this: capture a thought with the ⚡ button (or press Q), open Mind Maps and double-click the canvas to add nodes, drag from one node's edge to another to connect them, then convert a node into a task and link it to a goal. Lost? Click the 💡 lightbulb in the bottom-right corner of any page for a guided tour.",
  },
  uk: {
    workspace: "Моє життя",
    title: "Ласкаво просимо до Nodera",
    intro: "Nodera перетворює розрізнені думки на пов'язані ідеї, ідеї — на плани, а плани — на вимірюваний прогрес.",
    body: "Спробуйте: запишіть думку кнопкою ⚡ (або клавішею Q), відкрийте Mind Maps і двічі клацніть на полотні, щоб додати вузол, протягніть від краю одного вузла до іншого, щоб їх з'єднати, а потім перетворіть вузол на задачу та прив'яжіть до цілі. Заплуталися? Натисніть лампочку 💡 у правому нижньому куті будь-якої сторінки — і почнеться покроковий тур.",
  },
};

/** Creates the default workspace with starter folders and a welcome note, in the user's language. */
export async function bootstrapWorkspace(tx: Prisma.TransactionClient, userId: string, name?: string, locale: Loc = "en") {
  const l = locale === "uk" ? "uk" : "en";
  const w = WELCOME[l];
  const ws = await tx.workspace.create({
    data: { name: name ?? w.workspace, ownerId: userId, members: { create: { userId, role: "OWNER" } } },
  });
  await tx.folder.createMany({
    data: FOLDERS.map((f, i) => ({ name: f[l], icon: f.icon, color: f.color, workspaceId: ws.id, position: i })),
  });
  await tx.note.create({
    data: {
      workspaceId: ws.id,
      createdById: userId,
      title: w.title,
      content: textToDoc(`${w.intro}\n${w.body}`) as Prisma.InputJsonValue,
      contentText: `${w.intro}\n${w.body}`,
    },
  });
  return ws;
}
