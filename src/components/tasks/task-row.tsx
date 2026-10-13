"use client";
import { tr } from "@/lib/i18n";
import { CalendarClock, Repeat, Target } from "lucide-react";
import { invalidate, patch } from "@/lib/client/api";
import { toast, useUI } from "@/lib/client/store";
import { isOverdue, minutes, relDay, time } from "@/lib/client/format";
import type { Task } from "@/lib/client/types";
import { Checkbox } from "@/components/ui/input";
import { PRIORITY_COLOR, PRIORITY_LABEL } from "@/components/forms/options";
import { cn } from "@/lib/utils";

export async function toggleTask(t: Pick<Task, "id" | "status" | "title">, onChange?: (status: Task["status"]) => void) {
  const next = t.status === "DONE" ? "TODO" : "DONE";
  onChange?.(next);
  try {
    await patch(`/api/tasks/${t.id}`, { status: next });
    if (next === "DONE") toast.success(tr("Completed “{title}”", { title: t.title }), { label: tr("Undo"), run: () => toggleTask({ ...t, status: "DONE" }, onChange) });
    invalidate("/api/tasks", "/api/dashboard", "/api/goals", "/api/projects");
  } catch (e) {
    onChange?.(t.status);
    toast.error(e);
  }
}

export function TaskRow({ task, onChanged, showProject = true, compact }: { task: Task; onChanged?: () => void; showProject?: boolean; compact?: boolean }) {
  const { openTask } = useUI();
  const done = task.status === "DONE";
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div className={cn("group flex items-start gap-3 rounded-xl px-2.5 hover:bg-surface-2 transition-colors", compact ? "py-1.5" : "py-2")}>
      <Checkbox className="mt-0.5" checked={done} label={done ? tr("Mark as not done") : tr("Mark as done")} onChange={() => toggleTask(task, () => onChanged?.())} />
      <button onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <p className={cn("text-sm leading-snug", done && "text-muted line-through")}>
          {task.priority !== "MEDIUM" && task.priority !== "LOW" && !done && <span className="mr-1.5 inline-block size-1.5 -translate-y-0.5 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} title={tr("Priority: {p}", { p: PRIORITY_LABEL[task.priority] })} />}
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-muted">
          {task.status === "IN_PROGRESS" && <span className="font-medium text-accent">{tr("In progress")}</span>}
          {task.scheduledStart && <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />{relDay(task.scheduledStart)} {time(task.scheduledStart)}</span>}
          {task.dueDate && <span className={cn(overdue && "font-medium text-danger")}>{overdue ? tr("Overdue · ") : tr("Due ")}{relDay(task.dueDate)}</span>}
          {task.estimateMinutes ? <span>{minutes(task.estimateMinutes)}</span> : null}
          {task.recurrence !== "NONE" && <Repeat className="size-3" aria-label={tr("Repeats")} />}
          {showProject && task.project && <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: task.project.color }} />{task.project.title}</span>}
          {task.goal && <span className="inline-flex items-center gap-1"><Target className="size-3" />{task.goal.title}</span>}
          {task.tags.map((t) => <span key={t}>#{t}</span>)}
        </div>
      </button>
    </div>
  );
}
