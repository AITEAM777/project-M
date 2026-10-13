"use client";
import { tr, translated } from "@/lib/i18n";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckSquare, Kanban, List } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useUI } from "@/lib/client/store";
import type { Task } from "@/lib/client/types";
import { Card, EmptyState, PageSkeleton, Tabs } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskBoard } from "@/components/tasks/board";
import { QuickAddTask } from "@/components/tasks/quick-add";

type Filter = "today" | "upcoming" | "open" | "overdue" | "unscheduled" | "DONE" | "all";
const FILTERS: { value: Filter; label: string; q: string }[] = translated([
  { value: "today", label: "Today", q: "due=today" },
  { value: "upcoming", label: "Upcoming", q: "due=upcoming&status=open" },
  { value: "open", label: "All open", q: "status=open" },
  { value: "overdue", label: "Overdue", q: "due=overdue" },
  { value: "unscheduled", label: "No date", q: "due=unscheduled&status=open" },
  { value: "DONE", label: "Completed", q: "status=DONE" },
  { value: "all", label: "Everything", q: "" },
]);

export default function TasksPage() {
  return <Suspense fallback={<PageSkeleton />}><Tasks /></Suspense>;
}

function Tasks() {
  const params = useSearchParams();
  const { openTask } = useUI();
  const [filter, setFilter] = useState<Filter>((params.get("status") === "DONE" ? "DONE" : "today") as Filter);
  const [view, setView] = useState<"list" | "board">(() => (typeof window !== "undefined" && localStorage.getItem("nodera-task-view") === "board" ? "board" : "list"));
  const q = FILTERS.find((f) => f.value === filter)!.q;
  const { data, mutate } = useApi<{ tasks: Task[] }>(`/api/tasks?${q}`);
  useEffect(() => { const t = params.get("task"); if (t) openTask(t); }, [params, openTask]);
  useEffect(() => { try { localStorage.setItem("nodera-task-view", view); } catch {} }, [view]);

  const groups = useMemo(() => {
    const m = new Map<string, { title: string; color?: string; tasks: Task[] }>();
    for (const t of data?.tasks ?? []) {
      const key = t.project?.id ?? "_";
      if (!m.has(key)) m.set(key, { title: t.project?.title ?? tr("No project"), color: t.project?.color, tasks: [] });
      m.get(key)!.tasks.push(t);
    }
    return [...m.entries()].sort(([a], [b]) => (a === "_" ? 1 : b === "_" ? -1 : 0));
  }, [data]);

  return (
    <>
      <PageHeader title={tr("Tasks")} description={tr("Every actionable step across projects and goals.")}
        actions={<Tabs data-tour="tasks-view" value={view} onChange={setView} items={[{ value: "list", label: <span className="flex items-center gap-1"><List className="size-3.5" />{tr("List")}</span> }, { value: "board", label: <span className="flex items-center gap-1"><Kanban className="size-3.5" />{tr("Board")}</span> }]} />} />
      <div className="mb-4 flex flex-col gap-3">
        <Tabs data-tour="tasks-filters" value={filter} onChange={setFilter} className="max-w-full overflow-x-auto" items={FILTERS.map((f) => ({ value: f.value, label: f.label }))} />
        <QuickAddTask defaults={filter === "today" ? { dueDate: new Date(new Date().setHours(12, 0, 0, 0)).toISOString() } : undefined} onAdded={() => mutate()} />
      </div>
      {!data ? <PageSkeleton /> : !data.tasks.length ? (
        <EmptyState icon={<CheckSquare className="size-6" />} title={filter === "today" ? tr("Nothing due today") : filter === "overdue" ? tr("No overdue tasks 🎉") : tr("No tasks here")} body={tr("Add a task above, or turn any thought on a mind map into a task.")} />
      ) : view === "board" ? (
        <div data-tour="tasks-list"><TaskBoard tasks={data.tasks} onChanged={() => mutate()} /></div>
      ) : (
        <div data-tour="tasks-list" className="space-y-4">
          {groups.map(([key, g]) => (
            <Card key={key} className="p-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                {g.color && <span className="size-2 rounded-full" style={{ background: g.color }} />}
                <h2 className="text-sm font-semibold">{g.title}</h2>
                <span className="text-xs text-muted tabular">{g.tasks.filter((t) => t.status === "DONE").length}/{g.tasks.length}</span>
              </div>
              {g.tasks.map((t) => <TaskRow key={t.id} task={t} onChanged={() => mutate()} showProject={false} />)}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
