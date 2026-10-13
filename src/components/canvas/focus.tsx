"use client";
import { tp, tr } from "@/lib/i18n";
import { relDay } from "@/lib/client/format";
import { dayKey } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/input";
import type { MindNode } from "./types";

/** Focus mode chrome: a bar naming the focused branch and a "today in focus" checklist. */
export function FocusOverlay({ root, members: all, branch, onExit, onSelect, onToggleTask, onToggleHabit }: {
  root: MindNode | undefined;
  members: MindNode[];
  /** ids of the focused card and everything below it (parents shown for context are excluded from counts) */
  branch: Set<string>;
  onExit: () => void;
  onSelect: (id: string) => void;
  onToggleTask: (nodeId: string) => void;
  onToggleHabit: (nodeId: string) => void;
}) {
  if (!root) return null;
  const members = all.filter((n) => branch.has(n.id));
  const today = dayKey(new Date());
  const goals = members.filter((n) => n.data.linked?.goal || n.data.kind === "GOAL").length;
  const habits = members.filter((n) => n.data.linked?.habit);
  const tasks = members
    .filter((n) => n.data.linked?.task && n.data.linked.task.status !== "DONE")
    .sort((a, b) => (a.data.linked!.task!.dueDate ?? "9999").localeCompare(b.data.linked!.task!.dueDate ?? "9999"));
  const doneTasks = members.filter((n) => n.data.linked?.task?.status === "DONE").length;
  const counts = [goals && tp(goals, "# goal", "# goals"), habits.length && tp(habits.length, "# habit", "# habits"), tasks.length && tp(tasks.length, "# task", "# tasks")].filter(Boolean).join(" · ");

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[60px] z-20 flex justify-center px-3">
        <div role="status" className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl bg-[#18181b] py-1.5 pl-4 pr-1.5 text-sm text-white shadow-pop animate-pop-in dark:bg-[#ededf0] dark:text-[#18181b]">
          <span className="size-2 shrink-0 rounded-full bg-[#8b8bf5] shadow-[0_0_0_4px_rgba(139,139,245,.3)]" />
          <span className="truncate font-semibold">{tr("Focus: {title}", { title: root.data.title || tr("Untitled") })}</span>
          {counts && <span className="hidden whitespace-nowrap opacity-60 lg:inline">{counts}</span>}
          <button onClick={onExit} className="whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20">{tr("Exit")} · Esc</button>
        </div>
      </div>
      <aside className="absolute left-3 top-[116px] z-20 hidden w-[260px] rounded-2xl border border-border bg-surface p-3.5 shadow-pop animate-pop-in md:block" aria-label={tr("Today in focus")}>
        <h3 className="text-[13px]">{tr("Today in focus")}</h3>
        {!tasks.length && !habits.length ? (
          <p className="mt-2 text-xs leading-relaxed text-muted">{tr("No open tasks or habits in this branch. Turn cards into tasks to see them here.")}</p>
        ) : (
          <ul className="mt-2 max-h-[46vh] overflow-y-auto">
            {habits.map((n) => {
              const h = n.data.linked!.habit!;
              const done = (h.logs?.[today] ?? 0) >= Math.max(1, h.targetPerPeriod ?? 1);
              return (
                <li key={n.id} className="flex items-center gap-2.5 border-t border-surface-2 py-2 first:border-t-0">
                  <Checkbox checked={done} onChange={() => onToggleHabit(n.id)} label={h.title} />
                  <button onClick={() => onSelect(n.id)} className={cn("min-w-0 flex-1 truncate text-left text-[13px]", done && "text-muted")}>{h.icon} {h.title}</button>
                </li>
              );
            })}
            {tasks.map((n) => {
              const t = n.data.linked!.task!;
              return (
                <li key={n.id} className="flex items-center gap-2.5 border-t border-surface-2 py-2 first:border-t-0">
                  <Checkbox checked={false} onChange={() => onToggleTask(n.id)} label={t.title} />
                  <button onClick={() => onSelect(n.id)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13px]">{t.title}</span>
                    {t.dueDate && <span className="block text-[11px] text-muted">{relDay(t.dueDate)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {doneTasks > 0 && <p className="mt-2 text-[11px] text-success">✓ {tp(doneTasks, "# task done in this branch", "# tasks done in this branch")}</p>}
        <p className="mt-2 border-t border-surface-2 pt-2 text-[11px] leading-snug text-muted">{tr("The rest of the map is dimmed so nothing distracts you.")}</p>
      </aside>
    </>
  );
}
