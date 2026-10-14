"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Огляд", icon: "📊" },
  { href: "/users", label: "Клієнти", icon: "👥" },
  { href: "/payments", label: "Платежі", icon: "💳" },
  { href: "/log", label: "Журнал дій", icon: "🗒" },
];

export function AdminNav() {
  const path = usePathname().replace(/^\/admin/, "") || "/";
  return (
    <nav className="flex gap-1 md:flex-col" aria-label="Розділи адмін-панелі">
      {ITEMS.map((i) => {
        const on = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] ${on ? "bg-white/12 font-semibold text-white" : "text-white/65 hover:bg-white/8 hover:text-white"}`}>
            <span aria-hidden>{i.icon}</span>{i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LogoutButton() {
  return (
    <button className="text-[13px] text-white/60 hover:text-white" onClick={async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/login";
    }}>Вийти</button>
  );
}
