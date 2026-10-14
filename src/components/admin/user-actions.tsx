"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";

const field = "h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[14px] outline-none focus:border-[var(--accent)]";

export function UserActions({ userId, plan, sessions }: { userId: string; plan: string; sessions: number }) {
  const router = useRouter();
  const inMonth = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ plan: "PRO", until: inMonth, note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Помилка" });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        void act(() => api(`/api/admin/users/${userId}/plan`, { method: "POST", json: { ...form, until: new Date(`${form.until}T23:59:59`).toISOString(), note: form.note || undefined }, ws: null }), "Доступ видано");
      }}>
        <p className="text-[13.5px] text-[var(--muted)]">Видати тариф вручну — подарунок, партнер, компенсація. Після дати користувач автоматично повернеться на безкоштовний.</p>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="grant-plan">Тариф</label>
          <select id="grant-plan" className={field} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
            <option value="PRO">Pro</option><option value="MAX">Максимум</option><option value="TEAMS">Команди</option>
          </select>
          <label className="sr-only" htmlFor="grant-until">До дати</label>
          <input id="grant-until" type="date" className={field} value={form.until} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, until: e.target.value })} />
        </div>
        <label className="sr-only" htmlFor="grant-note">Примітка</label>
        <input id="grant-note" className={`${field} w-full`} placeholder="Примітка (для журналу), напр. «бета-тестер»" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button disabled={busy} className="h-10 rounded-xl bg-[var(--accent)] px-4 text-[14px] font-semibold text-white disabled:opacity-60">Видати доступ</button>
      </form>
      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
        {plan !== "FREE" && (
          <button disabled={busy} className="h-9 rounded-xl border border-[var(--border)] px-3.5 text-[13.5px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            onClick={() => confirm("Перевести користувача на безкоштовний тариф зараз?") && act(() => api(`/api/admin/users/${userId}/plan`, { method: "DELETE", ws: null }), "Переведено на безкоштовний")}>
            Забрати платний тариф
          </button>
        )}
        <button disabled={busy || sessions === 0} className="h-9 rounded-xl border border-[var(--border)] px-3.5 text-[13.5px] font-semibold hover:bg-[var(--surface-2)] disabled:opacity-50"
          onClick={() => confirm("Вийти з акаунта на всіх пристроях користувача?") && act(() => api(`/api/admin/users/${userId}/sessions`, { method: "DELETE", ws: null }), "Сесії завершено")}>
          Вийти на всіх пристроях ({sessions})
        </button>
      </div>
      {msg && <p role="status" className={`text-[13.5px] ${msg.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{msg.text}</p>}
    </div>
  );
}
