"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const COPY = {
  uk: { title: "Сторінку не знайдено", text: "Можливо, посилання застаріло або сторінку видалили.", home: "На головну", app: "Відкрити Nodera" },
  en: { title: "Page not found", text: "The link may be outdated, or the page was removed.", home: "Home", app: "Open Nodera" },
};

export default function NotFound() {
  const [lang, setLang] = useState<"uk" | "en">("uk");
  useEffect(() => { try { if (localStorage.getItem("nodera-locale") === "en") setLang("en"); } catch {} }, []);
  const t = COPY[lang];
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div>
        <p className="font-display text-[88px] font-bold leading-none tracking-tight text-accent">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-muted">{t.text}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">{t.home}</Link>
          <Link href="/dashboard" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover">{t.app}</Link>
        </div>
      </div>
    </main>
  );
}
