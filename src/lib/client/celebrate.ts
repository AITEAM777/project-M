"use client";
import { create } from "zustand";

export interface GoalDelta { id: string; title: string; before: number; after: number }

export const useCelebrate = create<{
  pulse: (GoalDelta & { key: number }) | null;
  goalId: string | null;
  showPulse: (d: GoalDelta) => void;
  hidePulse: () => void;
  celebrate: (goalId: string) => void;
  close: () => void;
}>((set) => ({
  pulse: null,
  goalId: null,
  showPulse: (d) => set({ pulse: { ...d, key: Date.now() } }),
  hidePulse: () => set({ pulse: null }),
  celebrate: (goalId) => set({ goalId, pulse: null }),
  close: () => set({ goalId: null }),
}));

/** Turns goal progress changes from an API response into feedback: a progress pulse, or the celebration when a goal hits 100%. */
export function reportGoals(goals: GoalDelta[] | undefined) {
  const up = (goals ?? []).filter((g) => g.after > g.before);
  if (!up.length) return;
  const finished = up.find((g) => g.after >= 100 && g.before < 100);
  if (finished) useCelebrate.getState().celebrate(finished.id);
  else useCelebrate.getState().showPulse(up.sort((a, b) => b.after - b.before - (a.after - a.before))[0]);
}
