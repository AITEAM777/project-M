"use client";
import { useEffect, useRef, useState } from "react";
import { useApi } from "./api";
import type { Me } from "./types";

export function useMe() {
  return useApi<Me>("/api/me", { revalidateOnFocus: false });
}

/** Global keyboard shortcut (ignored while typing in inputs unless `allowInInputs`). */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, opts: { allowInInputs?: boolean; enabled?: boolean } = {}) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (opts.enabled === false) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts.pop()!;
    const mod = parts.includes("mod");
    const shift = parts.includes("shift");
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      if (typing && !opts.allowInInputs && !mod) return;
      if (mod !== (e.metaKey || e.ctrlKey)) return;
      if (shift !== e.shiftKey) return;
      if (e.altKey) return;
      if (e.key.toLowerCase() !== key) return;
      ref.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, opts.allowInInputs, opts.enabled]);
}

export function useDebouncedValue<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = matchMedia(q);
    setM(mq.matches);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

/** Applies theme preference to <html> and remembers it for the no-flash script. */
export function applyTheme(theme: string) {
  try { localStorage.setItem("nodera-theme", theme); } catch {}
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
