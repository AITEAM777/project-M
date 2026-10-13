"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  info: (message: string, action?: Toast["action"]) => useToasts.getState().push({ message, kind: "info", action }),
  success: (message: string, action?: Toast["action"]) => useToasts.getState().push({ message, kind: "success", action }),
  error: (e: unknown) => useToasts.getState().push({ message: e instanceof Error ? e.message : String(e), kind: "error" }),
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
