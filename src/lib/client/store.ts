"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tr } from "@/lib/i18n";

export const useWorkspace = create<{ id: string | null; set: (id: string) => void }>()(
  persist((set) => ({ id: null, set: (id) => set({ id }) }), { name: "nodera-workspace" }),
);

type Toast = { id: number; message: string; kind: "info" | "success" | "error"; action?: { label: string; run: () => void } };
export const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.action ? 6500 : 3800);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = {
  info: (message: string, action?: Toast["action"]) => useToasts.getState().push({ message: tr(message), kind: "info", action: action && { ...action, label: tr(action.label) } }),
  success: (message: string, action?: Toast["action"]) => useToasts.getState().push({ message: tr(message), kind: "success", action: action && { ...action, label: tr(action.label) } }),
  error: (e: unknown) => {
    // Plan limits already opened the upgrade dialog; don't repeat them as an error.
    if ((e as { handled?: boolean } | null)?.handled) return;
    useToasts.getState().push({ message: tr(e instanceof Error ? e.message : String(e)), kind: "error" });
  },
};

type ConfirmReq = { title: string; body?: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void };
export const useConfirmStore = create<{ req: ConfirmReq | null; open: (r: ConfirmReq) => void; close: () => void }>((set) => ({
  req: null,
  open: (req) => set({ req }),
  close: () => set({ req: null }),
}));

/** Promise-based confirmation dialog: `if (await confirm({...})) ...` */
export function confirm(opts: Omit<ConfirmReq, "resolve">) {
  return new Promise<boolean>((resolve) => useConfirmStore.getState().open({ ...opts, resolve }));
}

/** UI chrome state: quick capture, command palette, right context panel, mobile sidebar. */
export type CreateKind = "task" | "goal" | "project" | "habit" | "event" | "map" | "note" | "folder";
export const useUI = create<{
  create: { kind: CreateKind; defaults?: Record<string, unknown> } | null;
  openCreate: (kind: CreateKind, defaults?: Record<string, unknown>) => void;
  closeCreate: () => void;
  taskId: string | null;
  openTask: (id: string | null) => void;
  captureOpen: boolean;
  paletteOpen: boolean;
  sidebarOpen: boolean;
  setCapture: (v: boolean) => void;
  setPalette: (v: boolean) => void;
  setSidebar: (v: boolean) => void;
}>((set) => ({
  create: null,
  openCreate: (kind, defaults) => set({ create: { kind, defaults } }),
  closeCreate: () => set({ create: null }),
  taskId: null,
  openTask: (id) => set({ taskId: id }),
  captureOpen: false,
  paletteOpen: false,
  sidebarOpen: false,
  setCapture: (v) => set({ captureOpen: v }),
  setPalette: (v) => set({ paletteOpen: v }),
  setSidebar: (v) => set({ sidebarOpen: v }),
}));

/** Why the upgrade dialog opened: a plan limit (goals, maps, …) or a Pro tool (path, structures, history). */
export type UpgradeReason = "goals" | "maps" | "habits" | "projects" | "nodes" | "workspaces" | "storage" | "ai" | "path" | "structures" | "history" | "generic";
export const useUpgrade = create<{
  reason: UpgradeReason | null;
  max: number | null;
  welcome: { plan: string; trial: boolean } | null;
  open: (reason: UpgradeReason, max?: number | null) => void;
  close: () => void;
  setWelcome: (w: { plan: string; trial: boolean } | null) => void;
}>((set) => ({
  reason: null,
  max: null,
  welcome: null,
  open: (reason, max = null) => set({ reason, max }),
  close: () => set({ reason: null, max: null }),
  setWelcome: (welcome) => set({ welcome, reason: null }),
}));
