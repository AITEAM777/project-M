"use client";
import { differenceInCalendarDays } from "date-fns";
import { tp, tr } from "@/lib/i18n";
import { fmt, minutes, relDay, time } from "@/lib/client/format";
import { dayKey, habitStats } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/celebrate/progress-ring";
import type { Linked } from "./types";

const chip = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-4";

/** Goal card: progress ring, milestones/tasks and days left. */
export function GoalLive({ goal, color }: { goal: NonNullable<Linked["goal"]>; color: string }) {
  const done = goal.progress >= 100 || goal.status === "COMPLETED";
  const left = goal.targetDate ? differenceInCalendarDays(new Date(goal.targetDate), new Date()) : null;
  return (
    <div className="flex items-center gap-2.5">
      <ProgressRing value={goal.progress} size={44} stroke={5} color={done ? "var(--success)" : color} label className="shrink-0 text-[var(--text)]" />
      <div className="min-w-0 text-[10.5px] leading-snug text-[var(--muted)]">
        {!!goal.milestonesTotal && <p>{tr("milestones {a}/{b}", { a: goal.milestonesDone ?? 0, b: goal.milestonesTotal })}</p>}
        {!!goal.tasksTotal && <p>{tr("tasks {a}/{b}", { a: goal.tasksDone ?? 0, b: goal.tasksTotal })}</p>}
        {done ? <p className="font-semibold text-[var(--success)]">🏆 {tr("Achieved")}</p>
          : left !== null && <p className={cn(left < 0 && "font-semibold text-[var(--danger)]")}>⏳ {left < 0 ? tr("{n} days overdue", { n: -left }) : left === 0 ? tr("Due today") : tp(left, "# day left", "# days left")}</p>}
        {!goal.milestonesTotal && !goal.tasksTotal && !goal.targetDate && !done && <p>{tr("Add milestones or tasks to track progress")}</p>}
      </div>
    </div>
  );
}

/** Habit card: the last 7 days as squares (today is clickable) plus streak or regularity. */
export function HabitLive({ habit, onToggleToday, readOnly }: { habit: NonNullable<Linked["habit"]>; onToggleToday: () => void; readOnly: boolean }) {
  const logs = habit.logs ?? {};
  const target = Math.max(1, habit.targetPerPeriod ?? 1);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - 6 + i); return d; });
  const stats = habitStats({ frequency: habit.frequency ?? "DAILY", targetPerPeriod: target }, logs, today);
  const color = habit.color || "var(--success)";
  const weekly = habit.frequency === "WEEKLY";
  return (
    <div className="flex items-end justify-between gap-2">
      <div className="flex gap-[3px]">
        {days.map((d, i) => {
          const k = dayKey(d);
          const met = (logs[k] ?? 0) >= (weekly ? 1 : target);
          const isToday = i === 6;
          const cell = (
            <span className="block size-[15px] rounded-[4px] transition-transform" style={{ background: met ? color : "var(--surface-3)", boxShadow: isToday ? `0 0 0 1.5px var(--surface), 0 0 0 3px ${met ? color : "var(--border-strong)"}` : undefined }} />
          );
          return (
            <div key={k} className="flex flex-col items-center gap-0.5">
              {isToday && !readOnly ? (
                <button className="nodrag rounded-[4px] hover:scale-110 active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); onToggleToday(); }}
                  aria-label={met ? tr("Undo today’s check-in") : tr("Check in for today")} title={met ? tr("Undo today’s check-in") : tr("Check in for today")}>{cell}</button>
              ) : cell}
              <span className="text-[8.5px] uppercase text-[var(--muted)]">{fmt(d, "EEEEE")}</span>
            </div>
          );
        })}
      </div>
      <div className="text-right leading-none">
        {weekly ? (
          <><p className="font-[family-name:var(--font-display)] text-[15px] font-semibold" style={{ color }}>{"doneThisWeek" in stats ? stats.doneThisWeek : 0}/{target}</p><p className="mt-1 text-[9px] text-[var(--muted)]">{tr("this week")}</p></>
        ) : stats.streak >= 2 ? (
          <><p className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-orange-600 dark:text-orange-400">🔥{stats.streak}</p><p className="mt-1 text-[9px] text-[var(--muted)]">{tr("days in a row")}</p></>
        ) : (
          <><p className="font-[family-name:var(--font-display)] text-[15px] font-semibold" style={{ color }}>{stats.rate30}%</p><p className="mt-1 text-[9px] text-[var(--muted)]">{tr("regularity")}</p></>
        )}
      </div>
    </div>
  );
}

/** Task card chips: due date (red when overdue), time block and estimate. */
export function TaskLive({ task }: { task: NonNullable<Linked["task"]> }) {
  if (task.status === "DONE") return null;
  const due = task.dueDate ? differenceInCalendarDays(new Date(task.dueDate), new Date()) : null;
  const items: React.ReactNode[] = [];
  if (due !== null) {
    if (due < 0) items.push(<span key="due" className={cn(chip, "bg-[var(--danger-soft)] text-[var(--danger)]")}>⚠ {tp(-due, "Overdue # day", "Overdue # days")}</span>);
    else items.push(<span key="due" className={cn(chip, due <= 1 ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--surface-2)] text-[var(--text-2)]")}>📅 {relDay(task.dueDate)}</span>);
  }
  if (task.scheduledStart) items.push(<span key="time" className={cn(chip, "bg-[var(--accent-soft)] text-[var(--accent)]")}>🕒 {relDay(task.scheduledStart)} {time(task.scheduledStart)}</span>);
  if (task.estimateMinutes) items.push(<span key="est" className={cn(chip, "bg-[var(--surface-2)] text-[var(--text-2)]")}>⏱ {minutes(task.estimateMinutes)}</span>);
  if (task.status === "IN_PROGRESS") items.push(<span key="st" className={cn(chip, "bg-[var(--accent-soft)] text-[var(--accent)]")}>● {tr("In progress")}</span>);
  return items.length ? <div className="flex flex-wrap gap-1">{items}</div> : null;
}

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  PLANNING: { label: "Planning", cls: "bg-[var(--surface-2)] text-[var(--text-2)]" },
  ACTIVE: { label: "In progress", cls: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  ON_HOLD: { label: "On hold", cls: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  COMPLETED: { label: "Completed", cls: "bg-[var(--success-soft)] text-[var(--success)]" },
};

/** Project card: status, tasks done and a progress bar. */
export function ProjectLive({ project, color }: { project: NonNullable<Linked["project"]>; color: string }) {
  const st = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.ACTIVE;
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        <span className={cn(chip, st.cls)}>● {tr(st.label)}</span>
        {!!project.tasksTotal && <span className={cn(chip, "bg-[var(--surface-2)] text-[var(--text-2)]")}>{tr("{a}/{b} tasks", { a: project.tasksDone ?? 0, b: project.tasksTotal })}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${project.progress}%`, background: project.progress >= 100 ? "var(--success)" : color }} /></div>
        <span className="text-[10.5px] tabular text-[var(--muted)]">{project.progress}%</span>
      </div>
    </div>
  );
}
