"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight, GripVertical, Plus, Target } from "lucide-react";
import { invalidate, patch, useApi } from "@/lib/client/api";
import { toast, useUI } from "@/lib/client/store";
import { minutes, time } from "@/lib/client/format";
import { expandRecurring, findConflicts, minutesByGoal, suggestSlots, type RecurringBlock, type TimeBlock } from "@/lib/schedule";
import type { CalEvent, Goal, Task } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card, Tabs } from "@/components/ui/misc";
import { EventForm } from "@/components/forms/other-forms";
import { cn } from "@/lib/utils";
import { del } from "@/lib/client/api";
import { confirm } from "@/lib/client/store";

const HOUR = 48;
const SNAP = 15;
type CalTask = Pick<Task, "id" | "title" | "status" | "priority" | "dueDate" | "scheduledStart" | "scheduledEnd" | "estimateMinutes" | "goalId"> & { project: { id: string; title: string; color: string } | null };
type Block = TimeBlock & { kind: "event" | "task"; recurring?: boolean; done?: boolean; base?: CalEvent };

export default function CalendarPage() {
  const [view, setView] = useState<"week" | "day" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const { openTask } = useUI();
  const [editing, setEditing] = useState<{ event?: CalEvent; defaults?: Partial<CalEvent> } | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  useEffect(() => { if (isMobile) setView("day"); }, [isMobile]);

  const range = useMemo(() => {
    if (view === "month") { const s = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }); return { from: s, to: addDays(startOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 7) }; }
    if (view === "day") return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) };
    const s = startOfWeek(anchor, { weekStartsOn: 1 });
    return { from: s, to: addDays(s, 7) };
  }, [anchor, view]);

  const { data, mutate } = useApi<{ events: CalEvent[]; tasks: CalTask[] }>(`/api/events?from=${range.from.toISOString()}&to=${range.to.toISOString()}`);
  const { data: open } = useApi<{ tasks: Task[] }>("/api/tasks?status=open&limit=200");
  const { data: goals } = useApi<{ goals: Goal[] }>("/api/goals");

  const blocks: Block[] = useMemo(() => {
    if (!data) return [];
    const evs = expandRecurring(
      data.events.map((e) => ({ id: e.id, title: e.title, start: new Date(e.start), end: new Date(e.end), allDay: e.allDay, color: e.color, source: "event" as const, sourceId: e.id, goalIds: e.goals.map((g) => g.id), recurrence: e.recurrence as RecurringBlock["recurrence"], recurUntil: e.recurUntil ? new Date(e.recurUntil) : null })),
      range.from, range.to,
    ).map((b) => ({ ...b, kind: "event" as const, recurring: data.events.find((e) => e.id === b.sourceId)?.recurrence !== "NONE", base: data.events.find((e) => e.id === b.sourceId) }));
    const ts = data.tasks.filter((t) => t.scheduledStart && t.scheduledEnd).map((t) => ({
      id: `task:${t.id}`, title: t.title, start: new Date(t.scheduledStart!), end: new Date(t.scheduledEnd!), color: t.project?.color ?? "#10b981",
      source: "task" as const, sourceId: t.id, goalIds: t.goalId ? [t.goalId] : [], kind: "task" as const, done: t.status === "DONE",
    }));
    return [...evs, ...ts];
  }, [data, range]);

  const conflicts = useMemo(() => findConflicts(blocks.filter((b) => !b.done)), [blocks]);
  const conflictIds = useMemo(() => new Set(conflicts.flatMap((c) => [c.a.id, c.b.id])), [conflicts]);
  const goalMinutes = useMemo(() => minutesByGoal(blocks), [blocks]);
  const refresh = () => { mutate(); invalidate("/api/dashboard", "/api/tasks"); };

  const moveBlock = async (b: Block, start: Date, end: Date) => {
    try {
      if (b.kind === "task") await patch(`/api/tasks/${b.sourceId}`, { scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() });
      else {
        const base = b.base!;
        // Moving an occurrence shifts the whole series by the same delta.
        const delta = start.getTime() - b.start.getTime();
        const dur = end.getTime() - start.getTime();
        const ns = new Date(new Date(base.start).getTime() + delta);
        await patch(`/api/events/${base.id}`, { start: ns.toISOString(), end: new Date(ns.getTime() + dur).toISOString() });
        if (b.recurring) toast.info("The whole recurring series was moved");
      }
      refresh();
    } catch (e) { toast.error(e); }
  };

  const scheduleTask = async (taskId: string, start: Date) => {
    const t = open?.tasks.find((x) => x.id === taskId);
    const dur = (t?.estimateMinutes || 60) * 60000;
    try { await patch(`/api/tasks/${taskId}`, { scheduledStart: start.toISOString(), scheduledEnd: new Date(start.getTime() + dur).toISOString() }); refresh(); invalidate("/api/tasks"); toast.success("Time-blocked"); } catch (e) { toast.error(e); }
  };

  const days = view === "day" ? [range.from] : Array.from({ length: 7 }, (_, i) => addDays(range.from, i));
  const step = (d: number) => setAnchor((a) => (view === "month" ? addMonths(a, d) : addDays(a, d * (view === "week" ? 7 : 1))));
  const title = view === "month" ? format(anchor, "MMMM yyyy") : view === "day" ? format(anchor, "EEEE, d MMMM") : `${format(range.from, "d MMM")} – ${format(addDays(range.to, -1), "d MMM yyyy")}`;

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="mr-2 text-2xl font-semibold tracking-tight">Calendar</h1>
          <Button size="icon-sm" variant="ghost" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft className="size-4" /></Button>
          <Button size="sm" variant="secondary" onClick={() => setAnchor(new Date())}>Today</Button>
          <Button size="icon-sm" variant="ghost" onClick={() => step(1)} aria-label="Next"><ChevronRight className="size-4" /></Button>
          <span className="text-sm font-medium">{title}</span>
          <div className="flex-1" />
          <Tabs value={view} onChange={setView} items={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />
          <Button size="sm" variant="primary" onClick={() => setEditing({ defaults: {} })}><Plus className="size-4" /> Event</Button>
        </div>
        {conflicts.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{conflicts.length} scheduling conflict{conflicts.length > 1 ? "s" : ""} in this period — see suggestions on the right.</span>
          </div>
        )}
        {view === "month" ? (
          <MonthGrid anchor={anchor} from={range.from} blocks={blocks} tasks={data?.tasks ?? []} onDay={(d) => { setAnchor(d); setView("day"); }} />
        ) : (
          <TimeGrid days={days} blocks={blocks} dueTasks={data?.tasks.filter((t) => t.dueDate && !t.scheduledStart) ?? []} conflictIds={conflictIds}
            onCreate={(start) => setEditing({ defaults: { start: start.toISOString(), end: new Date(start.getTime() + 3600_000).toISOString() } })}
            onOpen={(b) => (b.kind === "task" ? openTask(b.sourceId!) : setEditing({ event: b.base }))}
            onMove={moveBlock} onDropTask={scheduleTask} onOpenTask={openTask} />
        )}
      </div>

      <aside className="w-full space-y-4 xl:w-72">
        <ConflictsCard conflicts={conflicts} blocks={blocks} onApply={(b, s, e) => moveBlock(b as Block, s, e)} />
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">Unscheduled tasks</h2>
          <p className="mb-2 text-xs text-muted">Drag onto the calendar to time-block.</p>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {open?.tasks.filter((t) => !t.scheduledStart).slice(0, 40).map((t) => (
              <li key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm active:cursor-grabbing">
                <GripVertical className="size-3.5 text-muted" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="text-[11px] text-muted">{minutes(t.estimateMinutes || 60)}</span>
              </li>
            ))}
            {open && !open.tasks.some((t) => !t.scheduledStart) && <li className="text-xs text-muted">Everything is scheduled.</li>}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Time per goal</h2>
          {!goalMinutes.size ? <p className="text-xs text-muted">Link events or tasks to goals to see where your time goes. Activities can support several goals at once.</p> : (
            <ul className="space-y-2 text-sm">
              {[...goalMinutes.entries()].sort((a, b) => b[1] - a[1]).map(([gid, m]) => (
                <li key={gid} className="flex items-center gap-2"><Target className="size-3.5 text-muted" /><span className="flex-1 truncate">{goals?.goals.find((g) => g.id === gid)?.title ?? "Goal"}</span><span className="text-xs tabular text-muted">{minutes(Math.round(m))}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </aside>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.event ? "Edit event" : "New event"}>
        {editing && <EventForm event={editing.event} defaults={editing.defaults} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)}
          onDelete={editing.event ? async () => {
            if (!(await confirm({ title: "Delete this event?", body: editing.event!.recurrence !== "NONE" ? "All occurrences of this recurring event will be deleted." : undefined, confirmLabel: "Delete", danger: true }))) return;
            try { await del(`/api/events/${editing.event!.id}`); setEditing(null); refresh(); toast.success("Event deleted"); } catch (e) { toast.error(e); }
          } : undefined} />}
      </Dialog>
    </div>
  );
}

/** Lays out overlapping blocks side by side. */
function layoutDay(blocks: Block[]) {
  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());
  const out: { b: Block; col: number; cols: number }[] = [];
  let cluster: { b: Block; col: number }[] = [];
  let clusterEnd = 0;
  const flush = () => { const cols = Math.max(1, ...cluster.map((c) => c.col + 1)); cluster.forEach((c) => out.push({ ...c, cols })); cluster = []; };
  for (const b of sorted) {
    if (cluster.length && b.start.getTime() >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.b.end > b.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ b, col });
    clusterEnd = Math.max(clusterEnd, b.end.getTime());
  }
  flush();
  return out;
}

function TimeGrid({ days, blocks, dueTasks, conflictIds, onCreate, onOpen, onMove, onDropTask, onOpenTask }: {
  days: Date[]; blocks: Block[]; dueTasks: CalTask[]; conflictIds: Set<string>;
  onCreate: (start: Date) => void; onOpen: (b: Block) => void; onMove: (b: Block, s: Date, e: Date) => void; onDropTask: (id: string, start: Date) => void; onOpenTask: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const cols = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ b: Block; mode: "move" | "resize"; y0: number; x0: number; dy: number; dayShift: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { scroller.current?.scrollTo({ top: HOUR * 7 - 8 }); const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  const pointToDate = (day: Date, offsetY: number) => {
    const mins = Math.max(0, Math.min(24 * 60 - SNAP, Math.round(offsetY / HOUR * 60 / SNAP) * SNAP));
    const d = new Date(day); d.setHours(0, mins, 0, 0); return d;
  };

  useEffect(() => {
    if (!drag) return;
    const colW = (cols.current?.getBoundingClientRect().width ?? 700) / days.length;
    const onMoveEv = (e: PointerEvent) => setDrag((d) => d && { ...d, dy: e.clientY - d.y0, dayShift: d.mode === "move" ? Math.round((e.clientX - d.x0) / colW) : 0 });
    const onUp = () => {
      setDrag((d) => {
        if (!d) return null;
        const snapMin = Math.round((d.dy / HOUR) * 60 / SNAP) * SNAP;
        if (Math.abs(d.dy) < 4 && d.dayShift === 0) { onOpen(d.b); return null; }
        const s = new Date(d.b.start), e = new Date(d.b.end);
        if (d.mode === "move") { s.setMinutes(s.getMinutes() + snapMin); s.setDate(s.getDate() + d.dayShift); e.setMinutes(e.getMinutes() + snapMin); e.setDate(e.getDate() + d.dayShift); }
        else { e.setMinutes(e.getMinutes() + snapMin); if (e.getTime() - s.getTime() < SNAP * 60000) e.setTime(s.getTime() + SNAP * 60000); }
        onMove(d.b, s, e);
        return null;
      });
    };
    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMoveEv); window.removeEventListener("pointerup", onUp); };
  }, [drag?.b.id, drag?.mode, days.length, onMove, onOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="overflow-hidden">
      <div className="grid border-b border-border" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-l border-border px-2 py-2 text-center">
            <p className="text-[11px] uppercase text-muted">{format(d, "EEE")}</p>
            <p className={cn("mx-auto grid size-7 place-items-center rounded-full text-sm font-semibold", isSameDay(d, new Date()) && "bg-accent text-accent-fg")}>{format(d, "d")}</p>
            <div className="mt-1 space-y-0.5">
              {dueTasks.filter((t) => isSameDay(new Date(t.dueDate!), d)).slice(0, 3).map((t) => (
                <button key={t.id} onClick={() => onOpenTask(t.id)} className={cn("block w-full truncate rounded px-1 text-left text-[11px]", t.status === "DONE" ? "bg-surface-2 text-muted line-through" : "bg-accent-soft text-accent")} title={`Due: ${t.title}`}>{t.title}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div ref={scroller} className="relative max-h-[68vh] overflow-y-auto select-none">
        <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
          <div className="relative" style={{ height: HOUR * 24 }}>
            {Array.from({ length: 24 }, (_, h) => <span key={h} className="absolute right-2 -translate-y-1/2 text-[10.5px] tabular text-muted" style={{ top: h * HOUR }}>{h ? `${String(h).padStart(2, "0")}:00` : ""}</span>)}
          </div>
          <div ref={cols} className="contents">
            {days.map((day, di) => {
              const dayBlocks = blocks.filter((b) => !b.allDay && isSameDay(b.start, day));
              return (
                <div key={day.toISOString()} className="relative border-l border-border" style={{ height: HOUR * 24 }}
                  onClick={(e) => { if (e.target === e.currentTarget) onCreate(pointToDate(day, e.nativeEvent.offsetY)); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { const id = e.dataTransfer.getData("text/task"); if (id) { const r = e.currentTarget.getBoundingClientRect(); onDropTask(id, pointToDate(day, e.clientY - r.top)); } }}>
                  {Array.from({ length: 24 }, (_, h) => <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-border/70" style={{ top: h * HOUR }} />)}
                  {isSameDay(day, now) && <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-danger" style={{ top: (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR }}><span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-danger" /></div>}
                  {layoutDay(dayBlocks).map(({ b, col, cols: n }) => {
                    const active = drag?.b.id === b.id;
                    const snap = active ? Math.round((drag.dy / HOUR) * 60 / SNAP) * SNAP : 0;
                    const startMin = b.start.getHours() * 60 + b.start.getMinutes() + (active && drag.mode === "move" ? snap : 0);
                    const dur = (b.end.getTime() - b.start.getTime()) / 60000 + (active && drag.mode === "resize" ? snap : 0);
                    const conflict = conflictIds.has(b.id);
                    return (
                      <div key={b.id}
                        onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); setDrag({ b, mode: "move", y0: e.clientY, x0: e.clientX, dy: 0, dayShift: 0 }); }}
                        className={cn("absolute z-10 cursor-pointer overflow-hidden rounded-lg border px-1.5 py-1 text-[11.5px] leading-tight shadow-soft transition-shadow hover:shadow-card", active && "z-30 opacity-90 shadow-pop", conflict && "ring-2 ring-danger", b.done && "opacity-50")}
                        style={{
                          top: (startMin / 60) * HOUR, height: Math.max(18, (Math.max(SNAP, dur) / 60) * HOUR - 2),
                          left: `calc(${(col / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)`,
                          transform: active && drag.mode === "move" ? `translateX(${drag.dayShift * 100}%)` : undefined,
                          background: `color-mix(in oklab, ${b.color ?? "var(--accent)"} 16%, var(--surface))`, borderColor: `color-mix(in oklab, ${b.color ?? "var(--accent)"} 45%, transparent)`,
                        }}
                        title={`${b.title} · ${time(b.start)}–${time(b.end)}${conflict ? " · conflicts with another block" : ""}`}
                        data-col={di}
                      >
                        <p className={cn("truncate font-medium", b.done && "line-through")}>{b.kind === "task" ? "✓ " : ""}{b.title}</p>
                        {dur >= 40 && <p className="text-[10.5px] text-text-2">{time(b.start)}–{time(b.end)}{b.recurring ? " · ↻" : ""}</p>}
                        <div onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setDrag({ b, mode: "resize", y0: e.clientY, x0: e.clientX, dy: 0, dayShift: 0 }); }} className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize" />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MonthGrid({ anchor, from, blocks, tasks, onDay }: { anchor: Date; from: Date; blocks: Block[]; tasks: CalTask[]; onDay: (d: Date) => void }) {
  const cells = Array.from({ length: 42 }, (_, i) => addDays(from, i)).filter((d, i) => i < 35 || isSameMonth(d, anchor));
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] uppercase text-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const items = blocks.filter((b) => isSameDay(b.start, d));
          const due = tasks.filter((t) => t.dueDate && !t.scheduledStart && isSameDay(new Date(t.dueDate), d));
          return (
            <button key={d.toISOString()} onClick={() => onDay(d)} className={cn("min-h-24 border-b border-l border-border p-1.5 text-left align-top hover:bg-surface-2", !isSameMonth(d, anchor) && "bg-surface-2/40 text-muted")}>
              <span className={cn("grid size-6 place-items-center rounded-full text-xs font-medium", isSameDay(d, new Date()) && "bg-accent text-accent-fg")}>{format(d, "d")}</span>
              <div className="mt-1 space-y-0.5">
                {items.slice(0, 3).map((b) => <p key={b.id} className="truncate rounded px-1 text-[11px]" style={{ background: `color-mix(in oklab, ${b.color ?? "var(--accent)"} 16%, transparent)` }}>{time(b.start)} {b.title}</p>)}
                {due.slice(0, 2).map((t) => <p key={t.id} className="truncate rounded bg-accent-soft px-1 text-[11px] text-accent">Due: {t.title}</p>)}
                {items.length + due.length > 5 && <p className="text-[10px] text-muted">+{items.length + due.length - 5} more</p>}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function ConflictsCard({ conflicts, blocks, onApply }: { conflicts: ReturnType<typeof findConflicts>; blocks: Block[]; onApply: (b: TimeBlock, s: Date, e: Date) => void }) {
  if (!conflicts.length) return (
    <Card className="p-4"><h2 className="text-sm font-semibold">Conflicts</h2><p className="mt-1 text-xs text-muted">No overlapping activities in this period. ✓</p></Card>
  );
  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-warning"><AlertTriangle className="size-4" /> Conflicts</h2>
      <ul className="space-y-3">
        {conflicts.slice(0, 6).map((c, i) => {
          const mover = c.b;
          const dur = (mover.end.getTime() - mover.start.getTime()) / 60000;
          const slots = suggestSlots(blocks.filter((b) => b.id !== mover.id), mover.start, dur, { limit: 2 });
          return (
            <li key={i} className="text-sm">
              <p><span className="font-medium">{c.a.title}</span> overlaps <span className="font-medium">{c.b.title}</span> by {c.overlapMinutes}m on {format(c.a.start, "EEE d")}.</p>
              {slots.length ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-xs text-muted">Move “{mover.title}” to</span>
                  {slots.map((s) => <button key={s.start.toISOString()} onClick={() => onApply(mover, s.start, s.end)} className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent hover:brightness-95">{time(s.start)}</button>)}
                </div>
              ) : <p className="mt-1 text-xs text-muted">No free slot of {dur}m left that day — consider another day.</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
