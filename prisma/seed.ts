/**
 * Demo data: `npm run db:seed` creates demo@nodera.app / demo-password with a realistic
 * workspace (goals, projects, tasks, habits with history, calendar, notes and a connected map).
 * Re-running resets the demo account only.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const EMAIL = "demo@nodera.app";
const PASSWORD = "demo-password";
const id = (p = "n_") => p + randomBytes(9).toString("hex");
const day = (offset: number, h = 12, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d; };
const doc = (...paras: string[]) => ({ type: "doc", content: paras.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] })) }) as Prisma.InputJsonValue;

async function main() {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Demo User", passwordHash: await bcrypt.hash(PASSWORD, 12), onboardedAt: new Date() } });
  const ws = await prisma.workspace.create({ data: { name: "My Life", ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } } });
  const W = ws.id;
  const folder = async (name: string, icon: string, color: string, position: number) => prisma.folder.create({ data: { workspaceId: W, name, icon, color, position } });
  const fHealth = await folder("Health & Fitness", "💪", "#10b981", 0);
  const fFin = await folder("Personal Finance", "💰", "#f59e0b", 1);
  const fEdu = await folder("Education", "📚", "#3b82f6", 2);
  const fBiz = await folder("Business & Startups", "🚀", "#8b5cf6", 3);
  await folder("Personal Development", "🌱", "#22c55e", 4);
  await folder("Creative Ideas", "🎨", "#f97316", 5);

  const gFit = await prisma.goal.create({ data: { workspaceId: W, folderId: fHealth.id, title: "Improve physical fitness", category: "Health", priority: "HIGH", startDate: day(-21), targetDate: day(40), motivation: "More energy for work and family.", successCriteria: "Run 5 km without stopping; train 3× per week for 2 months.",
    milestones: { create: [
      { title: "Create a training schedule", done: true, completedAt: day(-18), position: 0 },
      { title: "Exercise three times per week", done: true, completedAt: day(-3), position: 1 },
      { title: "Improve nutrition", position: 2 },
      { title: "Evaluate progress after 30 days", position: 3, dueDate: day(9) },
    ] } } });
  const gCode = await prisma.goal.create({ data: { workspaceId: W, folderId: fEdu.id, title: "Learn programming", category: "Education", priority: "HIGH", startDate: day(-30), targetDate: day(120), motivation: "Build my own products.",
    milestones: { create: [{ title: "Finish JavaScript basics", done: true, position: 0 }, { title: "Build first React app", position: 1 }, { title: "Ship a portfolio project", position: 2 }] } } });
  const gFund = await prisma.goal.create({ data: { workspaceId: W, folderId: fFin.id, title: "Build an emergency fund", category: "Finance", targetDate: day(180), successCriteria: "3 months of expenses saved.",
    milestones: { create: [{ title: "Track expenses for a month", done: true, position: 0 }, { title: "Save first month of expenses", position: 1 }] } } });
  const gBiz = await prisma.goal.create({ data: { workspaceId: W, folderId: fBiz.id, title: "Launch a side business", category: "Business", priority: "MEDIUM", status: "NOT_STARTED", targetDate: day(240) } });
  await prisma.goalDependency.create({ data: { goalId: gBiz.id, dependsOnId: gCode.id } });

  const pApp = await prisma.project.create({ data: { workspaceId: W, folderId: fEdu.id, goalId: gCode.id, title: "Build a habit-tracker app", color: "#3b82f6", description: "Learn React by building something I use.", dueDate: day(45) } });
  const pBudget = await prisma.project.create({ data: { workspaceId: W, folderId: fFin.id, goalId: gFund.id, title: "Monthly budget system", color: "#f59e0b" } });

  const t = (data: Omit<Prisma.TaskUncheckedCreateInput, "workspaceId">) => prisma.task.create({ data: { workspaceId: W, ...data } });
  await t({ title: "Morning run 5 km", goalId: gFit.id, dueDate: day(0), scheduledStart: day(0, 7), scheduledEnd: day(0, 7, 45), estimateMinutes: 45, priority: "HIGH", recurrence: "WEEKDAYS", tags: ["health"] });
  await t({ title: "Plan meals for the week", goalId: gFit.id, dueDate: day(1), estimateMinutes: 30, tags: ["health", "nutrition"] });
  await t({ title: "Set up React project with Vite", projectId: pApp.id, goalId: gCode.id, status: "DONE", completedAt: day(-2, 20), estimateMinutes: 60, actualMinutes: 75 });
  await t({ title: "Build the habit list component", projectId: pApp.id, goalId: gCode.id, status: "IN_PROGRESS", dueDate: day(0), scheduledStart: day(0, 18), scheduledEnd: day(0, 19, 30), estimateMinutes: 90 });
  await t({ title: "Persist habits in localStorage", projectId: pApp.id, goalId: gCode.id, dueDate: day(3), estimateMinutes: 60 });
  await t({ title: "Deploy to Vercel", projectId: pApp.id, goalId: gCode.id, dueDate: day(10), estimateMinutes: 45 });
  await t({ title: "Export bank statements", projectId: pBudget.id, status: "DONE", completedAt: day(-5, 10) });
  await t({ title: "Categorize last month's expenses", projectId: pBudget.id, dueDate: day(-1), priority: "HIGH", tags: ["finance"] });
  await t({ title: "Open a high-yield savings account", projectId: pBudget.id, goalId: gFund.id, dueDate: day(5) });
  await t({ title: "Read chapter 3 of “Atomic Habits”", status: "DONE", completedAt: day(-1, 21) });
  for (let i = 1; i <= 12; i++) await t({ title: `Practice session #${i}`, goalId: gCode.id, status: "DONE", completedAt: day(-i * 2, 19) });

  const habits = [
    { title: "Exercise", icon: "🏃", color: "#10b981", goalId: gFit.id, frequency: "WEEKLY" as const, targetPerPeriod: 3, unit: "workouts", rate: 0.45 },
    { title: "Read 20 pages", icon: "📚", color: "#3b82f6", goalId: null, frequency: "DAILY" as const, targetPerPeriod: 1, unit: "times", rate: 0.75, reminderTime: "21:30" },
    { title: "Practice English", icon: "🗣️", color: "#8b5cf6", goalId: null, frequency: "DAILY" as const, targetPerPeriod: 1, unit: "sessions", rate: 0.6 },
    { title: "Drink water", icon: "💧", color: "#0ea5e9", goalId: gFit.id, frequency: "DAILY" as const, targetPerPeriod: 6, unit: "glasses", rate: 0.8 },
  ];
  for (const h of habits) {
    const { rate, ...data } = h;
    const habit = await prisma.habit.create({ data: { workspaceId: W, ...data } });
    const logs: Prisma.HabitLogCreateManyInput[] = [];
    for (let i = 120; i >= 1; i--) {
      const seeded = Math.abs(Math.sin(i * 12.9898 + h.title.length) * 43758.5453) % 1;
      if (seeded < rate) { const d = day(-i); logs.push({ habitId: habit.id, date: new Date(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00Z`), count: h.frequency === "DAILY" ? h.targetPerPeriod : 1 }); }
    }
    await prisma.habitLog.createMany({ data: logs });
  }

  const ev = (title: string, start: Date, mins: number, color: string, recurrence: "NONE" | "WEEKLY" | "WEEKDAYS", goalIds: string[]) =>
    prisma.calendarEvent.create({ data: { workspaceId: W, title, start, end: new Date(start.getTime() + mins * 60000), color, recurrence, goals: { create: goalIds.map((goalId) => ({ goalId })) } } });
  const monday = (() => { const d = day(0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
  const at = (dayOffset: number, h: number, m = 0) => { const d = new Date(monday); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d; };
  await ev("Work", at(0, 9), 8 * 60, "#64748b", "WEEKDAYS", []);
  await ev("Study programming", at(0, 18), 90, "#3b82f6", "WEEKLY", [gCode.id]);
  await ev("Study programming", at(2, 18), 90, "#3b82f6", "WEEKLY", [gCode.id]);
  await ev("Review finances", at(0, 20), 30, "#f59e0b", "WEEKLY", [gFund.id]);
  await ev("Walk + educational podcast", at(5, 10), 60, "#10b981", "WEEKLY", [gFit.id, gCode.id]);
  await ev("Personal reflection", at(6, 21), 30, "#8b5cf6", "WEEKLY", []);
  await ev("Dentist", at(3, 16, 30), 60, "#ef4444", "NONE", []);

  const note = (title: string, text: string[], folderId: string | null, kind: "NOTE" | "THOUGHT" = "NOTE", tags: string[] = []) =>
    prisma.note.create({ data: { workspaceId: W, title, folderId, kind, tags, content: doc(...text), contentText: text.join("\n"), createdById: user.id } });
  const nSleep = await note("Sleep affects everything", ["When I sleep 7+ hours my workouts and study sessions are noticeably better."], fHealth.id, "THOUGHT", ["health", "energy"]);
  await note("Startup idea: habit app for teams", ["Small teams could share streaks to keep each other accountable."], null, "THOUGHT", ["idea"]);
  await note("Maybe walk to work twice a week?", ["Combines exercise with podcast time."], null, "THOUGHT");
  const nPrinciples = await note("Training principles", ["Progressive overload beats intensity.", "Consistency > perfection: three average workouts beat one perfect workout.", "Track every session."], fHealth.id, "NOTE", ["health"]);
  await note("Budget categories", ["Housing, food, transport, learning, fun, savings (20%)."], fFin.id, "NOTE", ["finance"]);

  // A connected map that references real entities.
  const map = await prisma.mindMap.create({ data: { workspaceId: W, title: "My Personal Development", description: "How health, finance and education influence each other." } });
  const N = (key: string, data: Partial<Prisma.MapNodeUncheckedCreateInput> & { title: string; x: number; y: number }) => ({ key, id: id(), ...data });
  const nodes = [
    N("root", { title: "My Personal Development", kind: "GOAL", x: 0, y: 0, color: "#6366f1", icon: "🌱" }),
    N("health", { title: "Health", kind: "THOUGHT", x: -460, y: 200, color: "#10b981", icon: "💪" }),
    N("finance", { title: "Finance", kind: "THOUGHT", x: 0, y: 200, color: "#f59e0b", icon: "💰" }),
    N("edu", { title: "Education", kind: "THOUGHT", x: 460, y: 200, color: "#3b82f6", icon: "📚" }),
    N("fit", { title: gFit.title, kind: "GOAL", x: -460, y: 380, goalId: gFit.id }),
    N("sleep", { title: nSleep.title, kind: "THOUGHT", x: -720, y: 560, noteId: nSleep.id }),
    N("energy", { title: "More Energy", kind: "IDEA", x: -460, y: 740 }),
    N("learning", { title: "Improved Learning", kind: "IDEA", x: 120, y: 900 }),
    N("code", { title: gCode.title, kind: "GOAL", x: 460, y: 380, goalId: gCode.id }),
    N("app", { title: pApp.title, kind: "PROJECT", x: 720, y: 560, projectId: pApp.id }),
    N("career", { title: "Better Career Opportunities", kind: "IDEA", x: 460, y: 740 }),
    N("income", { title: "Higher Income", kind: "IDEA", x: 120, y: 560 }),
    N("fund", { title: gFund.title, kind: "GOAL", x: 0, y: 380, goalId: gFund.id }),
    N("principles", { title: nPrinciples.title, kind: "NOTE", x: -200, y: 560, noteId: nPrinciples.id }),
  ];
  await prisma.mapNode.createMany({ data: nodes.map(({ key: _k, ...n }) => ({ ...n, mapId: map.id })) });
  const k = (key: string) => nodes.find((n) => n.key === key)!.id;
  const edges: [string, string, Prisma.MapEdgeUncheckedCreateInput["relation"], string?][] = [
    ["root", "health", "PART_OF"], ["root", "finance", "PART_OF"], ["root", "edu", "PART_OF"],
    ["health", "fit", "PART_OF"], ["finance", "fund", "PART_OF"], ["edu", "code", "PART_OF"],
    ["sleep", "energy", "LEADS_TO"], ["fit", "energy", "LEADS_TO"], ["energy", "learning", "SUPPORTS"],
    ["code", "app", "REQUIRES"], ["code", "career", "LEADS_TO"], ["career", "income", "LEADS_TO"], ["income", "fund", "SUPPORTS"],
    ["principles", "fit", "SUPPORTS"], ["learning", "code", "SUPPORTS", "Study when rested"],
  ];
  await prisma.mapEdge.createMany({ data: edges.map(([s, tt, relation, label]) => ({ id: id("e_"), mapId: map.id, sourceId: k(s), targetId: k(tt), relation, label: label ?? "" })) });

  const acts = ["Captured “Sleep affects everything”", "Set goal “Improve physical fitness”", "Created project “Build a habit-tracker app”", "Completed “Set up React project with Vite”"];
  await prisma.activity.createMany({ data: acts.map((summary, i) => ({ workspaceId: W, userId: user.id, action: i === 3 ? "completed" : "created", entityType: "note", entityId: nSleep.id, summary, createdAt: day(-i, 10) })) });

  console.log(`Seeded demo account: ${EMAIL} / ${PASSWORD}`);
}

main().finally(() => prisma.$disconnect());
