/**
 * Background reminder worker: `npx tsx scripts/reminder-worker.ts` (run as a separate process,
 * or as a cron job with --once). Every minute it creates today's habit/task reminders for all
 * workspace members and marks due reminders as fired. Delivery channels (web push, email)
 * plug in at `deliver()`; in-app notifications are already served by /api/reminders.
 */
import { prisma } from "../src/lib/db";
import { materializeReminders } from "../src/lib/reminders-core";

async function deliver(r: { id: string; userId: string; title: string }) {
  // Integration point for push/email providers.
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", msg: "reminder.fired", reminderId: r.id, userId: r.userId, title: r.title }));
}

async function tick() {
  const members = await prisma.workspaceMember.findMany({ select: { userId: true, workspaceId: true } });
  for (const m of members) await materializeReminders(m.userId, m.workspaceId).catch((e) => console.error("materialize failed", e));
  const due = await prisma.reminder.findMany({ where: { firedAt: null, remindAt: { lte: new Date() } }, take: 500 });
  for (const r of due) {
    await deliver(r);
    await prisma.reminder.update({ where: { id: r.id }, data: { firedAt: new Date() } });
  }
}

async function main() {
  const once = process.argv.includes("--once");
  do {
    await tick();
    if (!once) await new Promise((res) => setTimeout(res, 60_000));
  } while (!once);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
