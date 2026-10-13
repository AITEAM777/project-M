"use client";
import { patch } from "@/lib/client/api";
import { LOCALES, setLocale, useLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Switches the UI language; saves it to the account when signed in. */
export function changeLocale(l: Locale, persist: boolean) {
  setLocale(l);
  if (persist) patch("/api/me", { locale: l }).catch(() => {});
}

export function LanguageSwitcher({ persist = true, className }: { persist?: boolean; className?: string }) {
  const locale = useLocale();
  return (
    <div role="radiogroup" aria-label="Language / Мова" className={cn("inline-flex rounded-lg border border-border bg-surface-2 p-0.5", className)}>
      {LOCALES.map((l) => (
        <button key={l.id} role="radio" aria-checked={locale === l.id} onClick={() => changeLocale(l.id, persist)}
          className={cn("flex items-center gap-1.5 rounded-md px-2.5 h-7 text-[13px] font-medium", locale === l.id ? "bg-surface text-text shadow-soft" : "text-muted hover:text-text")}>
          {l.id === "en" ? "EN" : "UA"}
        </button>
      ))}
    </div>
  );
}
