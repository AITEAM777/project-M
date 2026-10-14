import { prisma } from "@/lib/db";
import { Card, Empty, Pager, fmtDateTime } from "@/components/admin/ui";

export const metadata = { title: "Журнал дій" };
const PER_PAGE = 100;

const ACTION: Record<string, string> = {
  login: "✅ Вхід в адмін-панель",
  login_failed: "⛔ Невдала спроба входу",
  grant_plan: "🎁 Видано тариф",
  revoke_plan: "↩️ Забрано тариф",
  logout_user: "🔒 Завершено сесії користувача",
  export: "⬇ Експорт CSV",
};

export default async function AdminLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [count, rows] = await Promise.all([
    prisma.adminLog.count(),
    prisma.adminLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);
  return (
    <div className="space-y-5">
      <h1 className="text-[24px] font-semibold">Журнал дій</h1>
      <p className="-mt-2 text-[14px] text-[var(--muted)]">Кожен вхід (і невдала спроба) та кожна дія в адмін-панелі. Записи не можна змінити чи видалити звідси.</p>
      <Card>
        {rows.length === 0 ? <Empty>Записів ще немає.</Empty> : (
          <ul className="divide-y divide-[var(--border)] text-[14px]">
            {rows.map((r) => {
              const meta = r.meta as Record<string, unknown> | null;
              return (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <span>
                    <b>{ACTION[r.action] ?? r.action}</b>{r.target && <span className="text-[var(--text-2)]"> · {r.target}</span>}
                    {meta?.plan ? <span className="text-[var(--muted)]"> · {String(meta.plan)} до {String(meta.until).slice(0, 10)}{meta.note ? ` · «${String(meta.note)}»` : ""}</span> : null}
                    <span className="block text-[12.5px] text-[var(--muted)]">{r.email}{r.ip ? ` · IP ${r.ip}` : ""}</span>
                  </span>
                  <span className="tabular-nums text-[13px] text-[var(--muted)]">{fmtDateTime(r.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <Pager page={page} pages={Math.ceil(count / PER_PAGE)} href={(p) => `/log?page=${p}`} />
      </Card>
    </div>
  );
}
