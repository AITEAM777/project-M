import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Badge, Card, Empty, Pager, PlanBadge, STATUS, fmtDate } from "@/components/admin/ui";

export const metadata = { title: "Клієнти" };
const PER_PAGE = 30;

type Search = { q?: string; plan?: string; page?: string };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const plan = ["FREE", "PRO", "MAX", "TEAMS"].includes(sp.plan ?? "") ? (sp.plan as "FREE" | "PRO" | "MAX" | "TEAMS") : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = {
    ...(plan ? { plan } : {}),
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [count, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      select: {
        id: true, name: true, email: true, plan: true, createdAt: true, emailVerifiedAt: true,
        sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, currentPeriodEnd: true, period: true } },
        payments: { where: { status: "paid" }, select: { amount: true } },
      },
    }),
  ]);
  const href = (p: Partial<Search>) => {
    const u = new URLSearchParams();
    const v = { q, plan, page: undefined as string | undefined, ...p };
    if (v.q) u.set("q", v.q);
    if (v.plan) u.set("plan", v.plan);
    if (v.page && v.page !== "1") u.set("page", v.page);
    const s = u.toString();
    return `/users${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold">Клієнти <span className="text-[var(--muted)]">{count}</span></h1>
        <a href="/api/admin/export?type=users" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[13.5px] font-semibold hover:bg-[var(--surface-2)]">⬇ Експорт CSV</a>
      </div>
      <Card>
        <form className="mb-4 flex flex-wrap gap-2" action="/users">
          <input name="q" defaultValue={q} placeholder="Пошук за поштою або ім'ям" aria-label="Пошук"
            className="h-10 min-w-[240px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[14px] outline-none focus:border-[var(--accent)]" />
          {plan && <input type="hidden" name="plan" value={plan} />}
          <button className="h-10 rounded-xl bg-[var(--accent)] px-4 text-[14px] font-semibold text-white">Знайти</button>
        </form>
        <div className="mb-4 flex flex-wrap gap-1.5 text-[13px]">
          {[["", "Усі"], ["PRO", "Pro"], ["MAX", "Максимум"], ["TEAMS", "Команди"], ["FREE", "Старт"]].map(([v, l]) => (
            <Link key={v} href={href({ plan: (v || undefined) as Search["plan"] })} className={`rounded-full border px-3 py-1 ${(plan ?? "") === v ? "border-[var(--text)] bg-[var(--text)] text-[var(--surface)]" : "border-[var(--border)] hover:bg-[var(--surface-2)]"}`}>{l}</Link>
          ))}
        </div>
        {users.length === 0 ? <Empty>Нікого не знайдено.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[14px]">
              <thead><tr className="border-b border-[var(--border)] text-left text-[12px] uppercase tracking-[.05em] text-[var(--muted)]">
                <th className="py-2 pr-3 font-semibold">Клієнт</th><th className="py-2 pr-3 font-semibold">Тариф</th><th className="py-2 pr-3 font-semibold">Підписка</th>
                <th className="py-2 pr-3 font-semibold">Оплачено до</th><th className="py-2 pr-3 font-semibold">Сплатив усього</th><th className="py-2 pr-3 font-semibold">Останній вхід</th><th className="py-2 font-semibold">Реєстрація</th>
              </tr></thead>
              <tbody>
                {users.map((u) => {
                  const sub = u.subscriptions[0];
                  const st = sub ? STATUS[sub.status] : null;
                  const paid = u.payments.reduce((a, p) => a + p.amount, 0);
                  return (
                    <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="py-2.5 pr-3"><Link href={`/users/${u.id}`} className="block"><b>{u.name}</b><span className="block text-[12.5px] text-[var(--muted)]">{u.email}{u.emailVerifiedAt ? " ✓" : ""}</span></Link></td>
                      <td className="py-2.5 pr-3"><PlanBadge plan={u.plan} /></td>
                      <td className="py-2.5 pr-3">{st ? <Badge className={st[1]}>{st[0]}{sub!.period === "manual" ? " · вручну" : ""}</Badge> : <span className="text-[var(--muted)]">—</span>}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{sub && sub.status !== "EXPIRED" ? fmtDate(sub.currentPeriodEnd) : "—"}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{paid ? `${(paid / 100).toLocaleString("uk-UA")} ₴` : "—"}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-[var(--muted)]">{fmtDate(u.sessions[0]?.createdAt)}</td>
                      <td className="py-2.5 tabular-nums text-[var(--muted)]">{fmtDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={Math.ceil(count / PER_PAGE)} href={(p) => href({ page: String(p) })} />
      </Card>
    </div>
  );
}
