import { redirect } from "next/navigation";
import { getAdmin } from "@/server/admin";
import { mailMode } from "@/server/mail";
import { AdminNav, LogoutButton } from "@/components/admin/nav";

export const metadata = { title: { default: "Адмін-панель", template: "%s · Адмін Nodera" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return (
    <div className="min-h-dvh bg-[var(--bg)] md:grid md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-6 bg-[#1B1830] p-4 md:min-h-dvh">
        <div className="px-3 pt-1">
          <p className="text-[16px] font-semibold text-white">Nodera</p>
          <p className="text-[12px] text-white/50">Адмін-панель</p>
        </div>
        <AdminNav />
        <div className="mt-auto hidden px-3 md:block">
          <p className="truncate text-[12px] text-white/50" title={admin.email}>{admin.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-7">
        {mailMode() === "off" && (
          <p className="mb-5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-[13.5px] text-[var(--warning)]">
            ⚠️ Пошта не підключена: вхід сюди без коду з листа, реєстрація без підтвердження пошти. Додайте RESEND_API_KEY у Vercel.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
