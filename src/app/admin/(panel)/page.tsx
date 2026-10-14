import Link from "next/link";
import { prisma } from "@/lib/db";
import { expireSubscriptions } from "@/server/billing";
import { Bars, Card, Empty, Kpi, PlanBadge, fmtDate, fmtMoney, fmtNum, PLAN_LABEL } from "@/components/admin/ui";

export const metadata = { title: "Огляд" };

const DAY = 86400_000;
const MONTHS = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];

export default async function AdminOverview() {
  // Cheap safety net in case the daily cron hasn't run yet.
  await expireSubscriptions();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const since30 = new Date(now.getTime() - 29 * DAY);
  since30.setHours(0, 0, 0, 0);

  const [total, new7, new30, verified, byPlan, active7, subsByStatus, pastDue, trialsEnding, manualEnding, paidMonth, paidPrev, signupRows, revenueRows, latest] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } } }),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.groupBy({ by: ["plan"], _count: true }),
    prisma.activity.groupBy({ by: ["userId"], where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) }, userId: { not: null } } }),
    prisma.subscription.groupBy({ by: ["status"], _count: true }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({ where: { status: "TRIALING", currentPeriodEnd: { lte: new Date(now.getTime() + 3 * DAY) } } }),
    prisma.subscription.count({ where: { provider: "manual", status: "ACTIVE", currentPeriodEnd: { lte: new Date(now.getTime() + 7 * DAY) } } }),
    prisma.payment.aggregate({ where: { status: "paid", createdAt: { gte: monthStart } }, _sum: { amount: true, fee: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: "paid", createdAt: { gte: prevMonthStart, lt: monthStart } }, _sum: { amount: true } }),
    prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS d, count(*) AS n FROM "User" WHERE "createdAt" >= ${since30} GROUP BY 1`,
    prisma.$queryRaw<{ m: Date; s: bigint }[]>`SELECT date_trunc('month', "createdAt") AS m, sum("amount" - "fee") AS s FROM "Payment" WHERE "status" = 'paid' AND "createdAt" >= ${yearAgo} GROUP BY 1`,
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, plan: true, createdAt: true, emailVerifiedAt: true } }),
  ]);

  const planCount = (p: string) => byPlan.find((b) => b.plan === p)?._count ?? 0;
  const paying = total - planCount("FREE");
  const gross = paidMonth._sum.amount ?? 0;
  const fee = paidMonth._sum.fee ?? 0;
  const prev = paidPrev._sum.amount ?? 0;
  const growth = prev ? Math.round(((gross - prev) / prev) * 100) : null;
  const trialing = subsByStatus.find((s) => s.status === "TRIALING")?._count ?? 0;

  const signups = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since30.getTime() + i * DAY);
    const n = signupRows.find((r) => new Date(r.d).toDateString() === d.toDateString())?.n ?? 0n;
    return { label: i % 5 === 4 || i === 29 ? String(d.getDate()) : "", value: Number(n) };
  });
  const revenue = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const s = revenueRows.find((r) => new Date(r.m).getMonth() === m.getMonth() && new Date(r.m).getFullYear() === m.getFullYear())?.s ?? 0n;
    return { label: MONTHS[m.getMonth()], value: Number(s) };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[24px] font-semibold">Огляд</h1>
        <p className="text-[13px] text-[var(--muted)]">{new Intl.DateTimeFormat("uk-UA", { dateStyle: "full" }).format(now)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Користувачів" value={fmtNum(total)} sub={`+${new7} за тиждень · +${new30} за 30 днів`} tone="good" />
        <Kpi label="Платних клієнтів" value={fmtNum(paying)} sub={total ? `${((paying / total) * 100).toFixed(1)}% від усіх` : "—"} />
        <Kpi label="Дохід цього місяця" value={fmtMoney(gross)} sub={growth === null ? `${paidMonth._count} оплат` : `${growth >= 0 ? "+" : ""}${growth}% до мин. місяця`} tone={growth !== null && growth < 0 ? "bad" : "good"} />
        <Kpi label="Активні за 7 днів" value={fmtNum(active7.length)} sub="щось створили чи змінили" />
        <Kpi label="Пошту підтверджено" value={fmtNum(verified)} sub={total ? `${Math.round((verified / total) * 100)}% акаунтів` : "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Дохід по місяцях" aside="після комісії платіжки">
          {revenue.some((r) => r.value) ? <Bars data={revenue} format={(n) => fmtMoney(n)} /> : <Empty>Оплат ще немає. Графік заповниться, щойно підключимо платіжний сервіс.</Empty>}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[["Оплачено клієнтами", fmtMoney(gross)], ["Комісія платіжки", fmtMoney(-fee)], ["Надійшло на рахунок", fmtMoney(gross - fee)], ["Єдиний податок 5% (орієнт.)", fmtMoney(Math.round(gross * 0.05))]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[12px] text-[var(--muted)]">{k}</p><p className="mt-0.5 text-[16px] font-semibold tabular-nums">{v}</p></div>
            ))}
          </div>
        </Card>
        <Card title="Хто на якому тарифі">
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-[var(--surface-3)]">
            {(["PRO", "TEAMS"] as const).map((p) => <div key={p} className={p === "PRO" ? "bg-[var(--accent)]" : "bg-[var(--text)]"} style={{ width: `${total ? (planCount(p) / total) * 100 : 0}%` }} />)}
          </div>
          <ul className="space-y-2.5 text-[14px]">
            {(["PRO", "TEAMS", "FREE"] as const).map((p) => (
              <li key={p} className="flex items-center justify-between"><span>{PLAN_LABEL[p]}</span><b className="tabular-nums">{fmtNum(planCount(p))}</b></li>
            ))}
            <li className="flex items-center justify-between text-[var(--muted)]"><span>На пробному періоді</span><b className="tabular-nums">{trialing}</b></li>
          </ul>
          <h3 className="mb-2.5 mt-6 text-[14px] font-semibold">Потребують уваги</h3>
          <ul className="space-y-2 text-[14px]">
            <li className="flex justify-between"><span>⚠️ Не пройшло списання</span><b>{pastDue}</b></li>
            <li className="flex justify-between"><span>⏳ Пробний закінчується за 3 дні</span><b>{trialsEnding}</b></li>
            <li className="flex justify-between"><span>🎁 Ручний доступ спливає за 7 днів</span><b>{manualEnding}</b></li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Реєстрації за 30 днів" aside={`усього ${signups.reduce((a, b) => a + b.value, 0)}`}>
          <Bars data={signups} format={(n) => `${n} реєстр.`} />
        </Card>
        <Card title="Нові користувачі" aside={<Link className="font-semibold text-[var(--accent)] hover:underline" href="/users">Усі клієнти →</Link>}>
          <ul className="divide-y divide-[var(--border)]">
            {latest.map((u) => (
              <li key={u.id}>
                <Link href={`/users/${u.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                  <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{u.name}</span><span className="block truncate text-[12.5px] text-[var(--muted)]">{u.email}{u.emailVerifiedAt ? " ✓" : ""}</span></span>
                  <span className="flex shrink-0 flex-col items-end gap-1"><PlanBadge plan={u.plan} /><span className="text-[12px] text-[var(--muted)]">{fmtDate(u.createdAt)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
