"use client";
import { useState } from "react";
import { invalidate, patch } from "@/lib/client/api";
import { toast, useUI } from "@/lib/client/store";
import { isOverdue, relDay } from "@/lib/client/format";
import type { Task, TaskStatus } from "@/lib/client/types";
import { PRIORITY_COLOR } from "@/components/forms/options";
import { cn } from "@/lib/utils";

const COLS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "TODO", label: "To do", color: "#94a3b8" },
  { status: "IN_PROGRESS", label: "In progress", color: "#6366f1" },
  { status: "DONE", label: "Done", color: "#10b981" },
];

/** Kanban board with drag-and-drop between statuses (keyboard: open a card and change status). */
export function TaskBoard({ tasks, onChanged, showProject = true }: { tasks: Task[]; onChanged: () => void; showProject?: boolean }) {
  const { openTask, openCreate } = useUI();
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [local, setLocal] = useState<Record<string, TaskStatus>>({});
  const status = (t: Task) => local[t.id] ?? t.status;
  const drop = async (s: TaskStatus) => {
    const id = drag;
    setDrag(null); setOver(null);
    const t = tasks.find((x) => x.id === id);
    if (!t || status(t) === s) return;
    setLocal((l) => ({ ...l, [t.id]: s }));
    try {
      await patch(`/api/tasks/${t.id}`, { status: s });
      invalidate("/api/tasks", "/api/dashboard", "/api/goals", "/api/projects");
      onChanged();
    } catch (e) { toast.error(e); } finally { setLocal((l) => { const n = { ...l }; delete n[t.id]; return n; }); }
  };
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLS.map((c) => {
        const items = tasks.filter((t) => status(t) === c.status);
        return (
          <div key={c.status} onDragOver={(e) => { e.preventDefault(); setOver(c.status); }} onDragLeave={() => setOver(null)} onDrop={() => drop(c.status)}
            className={cn("flex min-h-40 flex-col rounded-2xl border border-border bg-surface-2/50 p-2 transition-colors", over === c.status && "border-accent bg-accent-soft/50")}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="size-2 rounded-full" style={{ background: c.color }} />
              <span className="text-sm font-semibold">{c.label}</span>
              <span className="text-xs text-muted tabular">{items.length}</span>
            </div>
            <div className="flex-1 space-y-2 p-1">
              {items.map((t) => (
                <div key={t.id} draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => setDrag(null)}
                  className={cn("cursor-grab rounded-xl border border-border bg-surface p-3 shadow-soft transition hover:shadow-card active:cursor-grabbing", drag === t.id && "opacity-40")}>
                  <button className="w-full text-left" onClick={() => openTask(t.id)}>
                    <p className={cn("text-sm font-medium leading-snug", c.status === "DONE" && "text-muted line-through")}>{t.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] }} />{t.priority.toLowerCase()}</span>
                      {t.dueDate && <span className={cn(isOverdue(t.dueDate, t.status) && "font-medium text-danger")}>{relDay(t.dueDate)}</span>}
                      {showProject && t.project && <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: t.project.color }} />{t.project.title}</span>}
                      {!!t.dependsOn?.some((d) => d.dependsOn.status !== "DONE") && <span className="text-warning">blocked</span>}
                    </div>
                  </button>
                </div>
              ))}
              {c.status === "TODO" && (
                <button onClick={() => openCreate("task", { status: "TODO", projectId: tasks[0]?.projectId ?? null })} className="w-full rounded-xl border border-dashed border-border py-2 text-sm text-muted hover:bg-surface hover:text-text">+ Add task</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
