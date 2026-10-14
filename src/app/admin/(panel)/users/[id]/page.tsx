import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge, Card, Empty, PlanBadge, STATUS, fmtDate, fmtDateTime, fmtMoney, fmtNum } from "@/components/admin/ui";
import { UserActions } from "@/components/admin/user-actions";

export const metadata = { title: "Клієнт" };

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 50 },
      sessions: { where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { createdAt: true, userAgent: true } },
      ownedSpaces: { select: { _count: { select: { notes: true, maps: true, goals: true, tasks: true, habits: true, projects: true } } } },
    },
  });
  if (!user) notFound();
  const totals = user.ownedSpaces.reduce((acc, w) => {
    for (const [k, v] of Object.entries(w._count)) acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {} as Record<string, number>);
  const paid = user.payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const lastActivity = await prisma.activity.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });

  return (
    <div className="space-y-5">
      <Link href="/users" className="text-[13.5px] text-[var(--muted)] hover:text-[var(--text)]">← Клієнти</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[24px] font-semibold">{user.name}</h1>
        <PlanBadge plan={user.plan} />
      </div>
      <p className="-mt-3 text-[14px] text-[var(--muted)]">
        {user.email} · {user.emailVerifiedAt ? <span className="text-[var(--success)]">пошту підтверджено</span> : "пошту не підтверджено"} · мова {user.locale.toUpperCase()} · з {fmtDate(user.createdAt)}
      </p>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card title="Підписки">
            {user.subscriptions.length === 0 ? <Empty>Підписок ще не було.</Empty> : (
              <ul className="divide-y divide-[var(--border)] text-[14px]">
                {user.subscriptions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span><PlanBadge plan={s.plan} /> <span className="ml-1 text-[var(--muted)]">{s.period === "manual" ? "вручну" : s.period === "trial" ? "пробний" : s.period === "year" ? "рік" : "місяць"} · {s.provider === "test" ? "тест" : s.provider}</span>{s.note && <span className="block text-[12.5px] text-[var(--muted)]">«{s.note}»</span>}</span>
                    <span className="flex items-center gap-2"><Badge className={STATUS[s.status][1]}>{STATUS[s.status][0]}</Badge><span className="tabular-nums text-[var(--muted)]">до {fmtDate(s.currentPeriodEnd)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Платежі" aside={paid ? `усього ${fmtMoney(paid)}` : undefined}>
            {user.payments.length === 0 ? <Empty>Платежів немає.</Empty> : (
              <ul className="divide-y divide-[var(--border)] text-[14px]">
                {user.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 py-2.5"><span>{fmtDateTime(p.createdAt)} · {p.plan ?? ""} {p.period ?? ""}</span><span className="tabular-nums">{fmtMoney(p.amount, p.currency)} · {p.status === "paid" ? "оплачено" : p.status === "refunded" ? "повернено" : "не пройшов"}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Дії"><UserActions userId={user.id} plan={user.plan} sessions={user.sessions.length} /></Card>
          <Card title="Використання">
            <ul className="grid grid-cols-2 gap-2 text-[14px]">
              {[["Цілі", totals.goals], ["Задачі", totals.tasks], ["Карти", totals.maps], ["Нотатки", totals.notes], ["Звички", totals.habits], ["Проєкти", totals.projects]].map(([k, v]) => (
                <li key={k as string} className="rounded-xl bg-[var(--surface-2)] px-3 py-2"><span className="text-[12px] text-[var(--muted)]">{k}</span><b className="block tabular-nums">{fmtNum(Number(v ?? 0))}</b></li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-[var(--muted)]">Остання дія: {fmtDateTime(lastActivity?.createdAt)} · активних сесій: {user.sessions.length}</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">Зміст нотаток, задач і карт адмін-панель не показує — лише кількість.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
