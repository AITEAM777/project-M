"use client";
/**
 * Minimal i18n: English source strings are the keys; other locales map them to
 * translations. `t()` is a plain function (not a hook) that reads the active locale,
 * so it also works in event handlers and helpers. The app shell re-mounts its tree
 * when the locale changes, so every rendered string is re-evaluated.
 */
import { create } from "zustand";
import { uk } from "./uk";

export const LOCALES = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "uk", label: "Українська", flag: "🇺🇦" },
] as const;
export type Locale = (typeof LOCALES)[number]["id"];

const DICTS: Record<Locale, Record<string, string>> = { en: {}, uk };
const STORAGE_KEY = "nodera-locale";

let current: Locale = "en";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "uk";
}

/** Best guess before the user record is loaded: saved choice, then browser language. */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {}
  const nav = (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase());
  return nav.some((l) => l.startsWith("uk") || l.startsWith("ru")) ? "uk" : "en";
}

export const useLocaleStore = create<{ locale: Locale; set: (l: Locale) => void }>((set) => ({
  locale: "en",
  set: (l) => {
    current = l;
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.cookie = `${STORAGE_KEY}=${l};path=/;max-age=31536000;samesite=lax`;
    }
    set({ locale: l });
  },
}));

/** Sets the locale before the first render (no-op on the server, where requests share modules). */
export function initLocale(l: string | null | undefined) {
  if (typeof window === "undefined") return;
  const loc: Locale = isLocale(l) ? l : detectLocale();
  current = loc;
  document.documentElement.lang = loc;
  try { localStorage.setItem(STORAGE_KEY, loc); } catch {}
  useLocaleStore.setState({ locale: loc });
}

export function setLocale(l: Locale) {
  useLocaleStore.getState().set(l);
}

export function getLocale(): Locale {
  return current;
}

/** Subscribes a component to locale changes. */
export function useLocale() {
  return useLocaleStore((s) => s.locale);
}

/** Translate an English source string; `{name}` placeholders are interpolated. */
export function tr(source: string, vars?: Record<string, string | number>): string {
  const raw = DICTS[current][source] ?? source;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Pluralized phrase. `forms` are English [one, other]; Ukrainian forms are looked up
 * as `${one}|${other}` -> "одна|кілька|багато" in the dictionary.
 * Use `#` for the number: tp(3, "# task", "# tasks") -> "3 задачі".
 */
export function tp(n: number, one: string, other: string): string {
  if (current === "uk") {
    const forms = DICTS.uk[`${one}|${other}`]?.split("|");
    if (forms?.length === 3) {
      const m10 = n % 10, m100 = n % 100;
      const f = m10 === 1 && m100 !== 11 ? forms[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? forms[1] : forms[2];
      return f.replace("#", String(n));
    }
  }
  return (n === 1 ? one : other).replace("#", String(n));
}

export const t = tr;

/**
 * Wraps a module-level constant (label maps, nav arrays…) so string values are
 * translated when read, not when the module is loaded.
 */
export function translated<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const v = Reflect.get(target, key, receiver);
      if (typeof v === "string" && typeof key === "string" && key !== "href" && key !== "id" && key !== "value" && key !== "color" && key !== "icon") return tr(v);
      if (v && typeof v === "object") return translated(v as object);
      return v;
    },
  });
}
