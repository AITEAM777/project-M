import { redirect } from "next/navigation";
import { getAdmin } from "@/server/admin";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Адмін-панель", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/");
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow)]">
        <p className="text-[13px] font-semibold uppercase tracking-[.06em] text-[var(--accent)]">Nodera · адмін</p>
        <h1 className="mb-6 mt-2 text-[24px] font-semibold">Вхід в адмін-панель</h1>
        <AdminLoginForm />
        <p className="mt-5 text-[12.5px] leading-relaxed text-[var(--muted)]">Доступ мають лише пошти зі списку ADMIN_EMAILS. Усі входи записуються в журнал.</p>
      </div>
    </main>
  );
}
