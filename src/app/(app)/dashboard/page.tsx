"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, Flame, Goal as GoalIcon, Lightbulb, ListTodo, Plus, Settings2, Sparkles, TriangleAlert, Workflow } from "lucide-react";
import { format } from "date-fns";
import { patch, useApi } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { toast, useUI } from "@/lib/client/store";
import { ago, relDay, time } from "@/lib/client/format";
import { expandRecurring, type RecurringBlock } from "@/lib/schedule";
import { habitStats } from "@/lib/habits";
import type { ActivityItem, Goal, Habit, Task } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageSkeleton, Progress, ProgressRing } from "@/components/ui/misc";
import { DailyBars, HabitHeat } from "@/components/charts/charts";
import { TaskRow } from "@/components/tasks/task-row";
import { cn } from "@/lib/utils";

interface Dashboard {
  today: { key: string; start: string; end: string };
  stats: { openToday: number; doneToday: number; overdue: number; activeGoals: number; notes: number; completedThisWeek: number };
  todayTasks: Task[];
  upcoming: { id: string; title: string; dueDate: string; priority: string; project: { title: string; color: string } | null }[];
  goals: Goal[];
  thoughts: { id: string; title: string; kind: string; contentText: string; createdAt: string; tags: string[] }[];
  projects: { id: string; title: string; color: string; status: string; progress: { total: number; done: number; percent: number } }[];
  maps: { id: string; title: string; updatedAt: string; _count: { nodes: number } }[];
  trend: { since: string; completedPerDay: number[]; thoughtsPerDay: number[] };
  habits: Habit[];
  events: { id: string; title: string; start: string; end: string; color: string; recurrence: string; recurUntil: string | null; allDay: boolean }[];
  activity: ActivityItem[];
}

const WIDGETS = [
  { id: "today", label: "Today's tasks", span: "lg:col-span-2" },
  { id: "schedule", label: "Today's schedule", span: "" },
  { id: "goals", label: "Active goals", span: "lg:col-span-2" },
  { id: "upcoming", label: "Upcoming deadlines", span: "" },
  { id: "progress", label: "Weekly progress", span: "lg:col-span-2" },
  { id: "habits", label: "Habit consistency", span: "" },
  { id: "thoughts", label: "Recent thoughts", span: "" },
  { id: "projects", label: "Project status", span: "" },
  { id: "maps", label: "Recent mind maps", span: "" },
  { id: "activity", label: "Activity", span: "" },
] as const;
type WidgetId = (typeof WIDGETS)[number]["id"];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { data, mutate } = useApi<Dashboard>("/api/dashboard");
  const { data: me, mutate: mutateMe } = useMe();
  const { setCapture, openCreate } = useUI();
  const [customizing, setCustomizing] = useState(false);

  const layout = useMemo(() => {
    const saved = me?.user.dashboardLayout ?? [];
    const known = saved.filter((w) => WIDGETS.some((x) => x.id === w.id));
    const missing = WIDGETS.filter((w) => !known.some((k) => k.id === w.id)).map((w) => ({ id: w.id as string, hidden: false }));
    return [...known, ...missing];
  }, [me]);

  const saveLayout = async (next: { id: string; hidden?: boolean }[]) => {
    mutateMe((m) => (m ? { ...m, user: { ...m.user, dashboardLayout: next } } : m), false);
    try { await patch("/api/me", { dashboardLayout: next }); } catch (e) { toast.error(e); }
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...layout];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    saveLayout(next);
  };

  if (!data || !me) return <PageSkeleton />;
  const s = data.stats;

  const render = (id: WidgetId) => {
    switch (id) {
      case "today": return <TodayWidget tasks={data.todayTasks} onChanged={() => mutate()} />;
      case "schedule": return <ScheduleWidget data={data} />;
      case "goals": return <GoalsWidget goals={data.goals} />;
      case "upcoming": return <UpcomingWidget items={data.upcoming} />;
      case "progress": return <ProgressWidget data={data} />;
      case "habits": return <HabitsWidget habits={data.habits} />;
      case "thoughts": return <ThoughtsWidget items={data.thoughts} onCapture={() => setCapture(true)} />;
      case "projects": return <ProjectsWidget items={data.projects} />;
      case "maps": return <MapsWidget items={data.maps} />;
      case "activity": return <ActivityWidget items={data.activity} />;
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{format(new Date(), "EEEE, d MMMM")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {me.user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant={customizing ? "primary" : "ghost"} size="sm" onClick={() => setCustomizing(!customizing)}><Settings2 className="size-4" /> {customizing ? "Done" : "Customize"}</Button>
          <Button size="sm" onClick={() => openCreate("task")}><Plus className="size-4" /> Task</Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<ListTodo className="size-4" />} label="Open today" value={s.openToday} sub={`${s.doneToday} done today`} />
        <Stat icon={<TriangleAlert className="size-4" />} label="Overdue" value={s.overdue} tone={s.overdue ? "danger" : undefined} sub={s.overdue ? "Needs attention" : "All on track"} />
        <Stat icon={<CheckCircle2 className="size-4" />} label="Done this week" value={s.completedThisWeek} sub="completed tasks" />
        <Stat icon={<GoalIcon className="size-4" />} label="Active goals" value={s.activeGoals} sub={`${s.notes} notes & thoughts`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {layout.map((w, i) => {
          const meta = WIDGETS.find((x) => x.id === w.id)!;
          if (w.hidden && !customizing) return null;
          return (
            <div key={w.id} className={cn("min-w-0", meta.span, w.hidden && "opacity-50")}>
              {customizing && (
                <div className="mb-1.5 flex items-center gap-1 text-xs">
                  <span className="flex-1 font-medium text-muted">{meta.label}</span>
                  <Button size="icon-sm" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-3.5" /></Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-3.5" /></Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => saveLayout(layout.map((x) => (x.id === w.id ? { ...x, hidden: !x.hidden } : x)))} aria-label={w.hidden ? "Show" : "Hide"}>
                    {w.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
              )}
              {render(w.id as WidgetId)}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: number; sub: string; tone?: "danger" }) {
  return (
    <Card className="p-4">
      <div className={cn("flex items-center gap-2 text-xs font-medium text-muted", tone === "danger" && "text-danger")}>{icon}{label}</div>
      <p className={cn("mt-1.5 text-2xl font-semibold tabular tracking-tight", tone === "danger" && "text-danger")}>{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </Card>
  );
}

function Widget({ title, href, action, children, className }: { title: string; href?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex h-full flex-col p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action ?? (href && <Link href={href} className="text-xs font-medium text-muted hover:text-accent">View all</Link>)}
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function TodayWidget({ tasks, onChanged }: { tasks: Task[]; onChanged: () => void }) {
  const { openCreate } = useUI();
  const open = tasks.filter((t) => t.status !== "DONE");
  const done = tasks.filter((t) => t.status === "DONE");
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  return (
    <Widget title="Today's tasks" href="/tasks" action={<div className="flex items-center gap-2"><span className="text-xs text-muted tabular">{done.length}/{tasks.length}</span><div className="w-20"><Progress value={pct} size="sm" /></div></div>}>
      {!tasks.length ? (
        <div className="py-6 text-center text-sm text-muted">
          Nothing scheduled for today.
          <div className="mt-3"><Button size="sm" onClick={() => openCreate("task")}><Plus className="size-4" /> Plan a task</Button></div>
        </div>
      ) : (
        <div className="-mx-2.5 max-h-[340px] overflow-y-auto">
          {open.map((t) => <TaskRow key={t.id} task={t} onChanged={onChanged} compact />)}
          {done.length > 0 && <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Completed</p>}
          {done.map((t) => <TaskRow key={t.id} task={t} onChanged={onChanged} compact />)}
        </div>
      )}
    </Widget>
  );
}

function ScheduleWidget({ data }: { data: Dashboard }) {
  const start = new Date(data.today.start), end = new Date(data.today.end);
  const blocks = expandRecurring(
    data.events.map((e) => ({ id: e.id, title: e.title, start: new Date(e.start), end: new Date(e.end), allDay: e.allDay, color: e.color, recurrence: e.recurrence as RecurringBlock["recurrence"], recurUntil: e.recurUntil ? new Date(e.recurUntil) : null })),
    start, end,
  );
  const timed = [
    ...blocks.map((b) => ({ id: b.id, title: b.title, start: b.start, end: b.end, color: b.color ?? "var(--accent)" })),
    ...data.todayTasks.filter((t) => t.scheduledStart && t.scheduledEnd && new Date(t.scheduledStart) >= start && new Date(t.scheduledStart) <= end)
      .map((t) => ({ id: t.id, title: `✓ ${t.title}`, start: new Date(t.scheduledStart!), end: new Date(t.scheduledEnd!), color: t.project?.color ?? "#10b981" })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());
  const now = Date.now();
  return (
    <Widget title="Today's schedule" href="/calendar">
      {!timed.length ? <p className="py-6 text-center text-sm text-muted">No time blocks today. <Link href="/calendar" className="text-accent">Plan your day →</Link></p> : (
        <ol className="space-y-1.5">
          {timed.map((b) => {
            const past = b.end.getTime() < now, current = b.start.getTime() <= now && b.end.getTime() >= now;
            return (
              <li key={b.id} className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5", current && "bg-accent-soft", past && "opacity-55")}>
                <span className="w-11 text-xs font-medium tabular text-muted">{time(b.start)}</span>
                <span className="h-7 w-1 rounded-full" style={{ background: b.color }} />
                <span className="min-w-0 flex-1 truncate text-sm">{b.title}</span>
                {current && <span className="text-[10px] font-semibold uppercase text-accent">Now</span>}
              </li>
            );
          })}
        </ol>
      )}
    </Widget>
  );
}

function GoalsWidget({ goals }: { goals: Goal[] }) {
  const { openCreate } = useUI();
  return (
    <Widget title="Active goals" href="/goals">
      {!goals.length ? (
        <EmptyState className="py-8" icon={<GoalIcon className="size-5" />} title="No active goals" body="Goals turn intentions into measurable progress." action={<Button size="sm" variant="primary" onClick={() => openCreate("goal")}>Set a goal</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface-2">
              <ProgressRing value={g.progress} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{g.title}</p>
                <p className="truncate text-xs text-muted">
                  {g.milestones.filter((m) => m.done).length}/{g.milestones.length} milestones · {g.doneTaskCount}/{g.taskCount} tasks
                  {g.targetDate && ` · ${relDay(g.targetDate)}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Widget>
  );
}

function UpcomingWidget({ items }: { items: Dashboard["upcoming"] }) {
  const { openTask } = useUI();
  return (
    <Widget title="Upcoming deadlines" href="/tasks">
      {!items.length ? <p className="py-6 text-center text-sm text-muted">No deadlines in the next two weeks.</p> : (
        <ul className="space-y-1">
          {items.map((t) => (
            <li key={t.id}>
              <button onClick={() => openTask(t.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                <span className="grid w-10 shrink-0 text-center leading-tight">
                  <span className="text-[10px] uppercase text-muted">{format(new Date(t.dueDate), "MMM")}</span>
                  <span className="text-base font-semibold tabular">{format(new Date(t.dueDate), "d")}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{t.title}</span>
                  <span className="block truncate text-xs text-muted">{relDay(t.dueDate)}{t.project && ` · ${t.project.title}`}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function ProgressWidget({ data }: { data: Dashboard }) {
  const done = data.trend.completedPerDay;
  const last7 = done.slice(-7).reduce((a, b) => a + b, 0);
  const prev7 = done.slice(-14, -7).reduce((a, b) => a + b, 0);
  const delta = last7 - prev7;
  return (
    <Widget title="Completed tasks · last 4 weeks" href="/tasks?status=DONE">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tabular tracking-tight">{last7}</span>
        <span className="text-sm text-muted">in the last 7 days</span>
        {(last7 > 0 || prev7 > 0) && <span className={cn("text-xs font-medium", delta >= 0 ? "text-success" : "text-warning")}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs the 7 days before</span>}
      </div>
      <DailyBars values={done} since={data.trend.since} label="Completed tasks per day" />
    </Widget>
  );
}

function HabitsWidget({ habits }: { habits: Habit[] }) {
  const { openCreate } = useUI();
  return (
    <Widget title="Habit consistency" href="/habits">
      {!habits.length ? <div className="py-6 text-center text-sm text-muted">No habits yet.<div className="mt-3"><Button size="sm" onClick={() => openCreate("habit")}>Start a habit</Button></div></div> : (
        <ul className="space-y-3.5">
          {habits.slice(0, 5).map((h) => {
            const st = habitStats(h, h.counts);
            return (
              <li key={h.id}>
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  <span>{h.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{h.title}</span>
                  {st.streak > 0 && <span className="inline-flex items-center gap-0.5 text-xs font-medium text-warning"><Flame className="size-3.5" />{st.streak}</span>}
                  <span className="text-xs tabular text-muted">{st.rate30}%</span>
                </div>
                <HabitHeat counts={h.counts} target={h.frequency === "DAILY" ? h.targetPerPeriod : 1} color={h.color} days={28} size={11} />
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}

function ThoughtsWidget({ items, onCapture }: { items: Dashboard["thoughts"]; onCapture: () => void }) {
  return (
    <Widget title="Recent thoughts" href="/thoughts" action={<Button size="xs" variant="ghost" onClick={onCapture}><Plus className="size-3" /> Capture</Button>}>
      {!items.length ? <p className="py-6 text-center text-sm text-muted">Your captured thoughts appear here.</p> : (
        <ul className="space-y-1">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={`/notes/${n.id}`} className="flex gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                {n.kind === "THOUGHT" ? <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" /> : <span className="mt-0.5 size-4 shrink-0 text-center text-xs">📝</span>}
                <span className="min-w-0">
                  <span className="block truncate text-sm">{n.title}</span>
                  <span className="block truncate text-xs text-muted">{ago(n.createdAt)}{n.contentText && n.contentText !== n.title ? ` · ${n.contentText}` : ""}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function ProjectsWidget({ items }: { items: Dashboard["projects"] }) {
  return (
    <Widget title="Project status" href="/projects">
      {!items.length ? <p className="py-6 text-center text-sm text-muted">No active projects.</p> : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="block group">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full" style={{ background: p.color }} />
                  <span className="min-w-0 flex-1 truncate group-hover:underline">{p.title}</span>
                  <span className="text-xs tabular text-muted">{p.progress.done}/{p.progress.total}</span>
                </div>
                <Progress value={p.progress.percent} size="sm" color={p.color} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function MapsWidget({ items }: { items: Dashboard["maps"] }) {
  return (
    <Widget title="Recent mind maps" href="/maps">
      {!items.length ? <p className="py-6 text-center text-sm text-muted">No maps yet.</p> : (
        <ul className="space-y-1">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/maps/${m.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <Workflow className="size-4 text-accent" />
                <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
                <span className="text-xs text-muted">{m._count.nodes} nodes · {ago(m.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function ActivityWidget({ items }: { items: ActivityItem[] }) {
  return (
    <Widget title="Activity" href="/timeline">
      {!items.length ? <p className="py-6 text-center text-sm text-muted">Nothing yet.</p> : (
        <ol className="relative space-y-2.5 border-l border-border pl-4">
          {items.slice(0, 8).map((a) => (
            <li key={a.id} className="relative text-sm">
              <span className={cn("absolute -left-[21px] top-1.5 size-2 rounded-full ring-4 ring-surface", a.action === "completed" ? "bg-success" : a.action === "deleted" ? "bg-danger" : a.entityType === "ai" ? "bg-accent" : "bg-border-strong")} />
              <p className="leading-snug">{a.entityType === "ai" && <Sparkles className="mr-1 inline size-3 text-accent" />}{a.summary}</p>
              <p className="text-xs text-muted">{ago(a.createdAt)}</p>
            </li>
          ))}
        </ol>
      )}
    </Widget>
  );
}

