"use client";
import { create } from "zustand";

const SEEN_KEY = "nodera-tours-seen";

function readSeen(): Record<string, true> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}"); } catch { return {}; }
}

export const useTour = create<{
  active: string | null;
  step: number;
  seen: Record<string, true>;
  loadSeen: () => void;
  start: (id: string) => void;
  go: (step: number) => void;
  finish: () => void;
}>((set, get) => ({
  active: null,
  step: 0,
  seen: {},
  loadSeen: () => set({ seen: readSeen() }),
  start: (id) => set({ active: id, step: 0 }),
  go: (step) => set({ step }),
  finish: () => {
    const { active, seen } = get();
    const next = active ? { ...seen, [active]: true as const } : seen;
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch {}
    set({ active: null, step: 0, seen: next });
  },
}));

/** Lets pages react to tour steps (e.g. the map selects a node so its panel can be explained). */
export function dispatchTourAction(action: string) {
  window.dispatchEvent(new CustomEvent("nodera:tour", { detail: action }));
}
