"use client";
import { fmt } from "@/lib/client/format";
import { guideHref } from "@/lib/guide";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays} from "date-fns";
import { Archive, Bell, Flame, MoreHorizontal, Pencil, Plus, Repeat, Target, Trash2, Trophy } from "lucide-react";
import { del, invalidate, patch, put, useApi } from "@/lib/client/api";
import { confirm, toast, useUI } from "@/lib/client/store";
import { dayKey, habitStats } from "@/lib/habits";
import type { Habit } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card, EmptyState, MenuItem, MenuSeparator, PageSkeleton, Popover, Tabs } from "@/components/ui/misc";
import { HabitForm } from "@/components/forms/other-forms";
import { PageHeader } from "@/components/shared/page-header";
import { PlaceOnMap } from "@/components/shared/place-on-map";
import { cn } from "@/lib/utils";

export default function HabitsPage() {
  const { openCreate } = useUI();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const { data, mutate } = useApi<{ habits: Habit[] }>(`/api/habits?days=370${tab === "archived" ? "&archived=1" : ""}`);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const setCount = async (h: Habit, key: string, count: number) => {
    mutate((d) => d && { habits: d.habits.map((x) => (x.id === h.id ? { ...x, counts: { ...x.counts, [key]: count } } : x)) }, false);
    try { await put(`/api/habits/${h.id}/log`, { date: key, count }); invalidate("/api/dashboard"); } catch (e) { toast.error(e); mutate(); }
  };
  const tap = (h: Habit, d: Date) => {
    const k = dayKey(d);
    const c = h.counts[k] ?? 0;
    const target = h.frequency === "DAILY" ? h.targetPerPeriod : 1;
    setCount(h, k, c >= target ? 0 : c + 1);
  };

  return (
    <>
      <PageHeader title={tr("Habits")} description={tr("Small, repeated actions that compound into your goals.")}
        actions={<><Tabs value={tab} onChange={setTab} items={[{ value: "active", label: tr("Active") }, { value: "archived", label: tr("Archived") }]} /><Button data-tour="habits-new" variant="primary" onClick={() => openCreate("habit")}><Plus className="size-4" />{" "}{tr("New habit")}</Button></>} />
      {!data ? <PageSkeleton /> : !data.habits.length ? (
        <EmptyState guide={{ href: guideHref("habits"), label: tr("How habits work — in the tutorial") }} icon={<Repeat className="size-6" />} title={tab === "active" ? tr("No habits yet") : tr("No archived habits")} body={tr("Examples: exercise, read 20 pages, practice a language, save money, journal, drink water.")}
          action={tab === "active" && <Button variant="primary" onClick={() => openCreate("habit")}><Plus className="size-4" />{" "}{tr("Create a habit")}</Button>} />
      ) : (
        <>
          <Card data-tour="habits-grid" className="mb-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-2.5 text-left font-medium">{tr("Habit")}</th>
                  {days.map((d) => <th key={d.toISOString()} className={cn("w-12 py-2.5 text-center font-medium", dayKey(d) === dayKey(today) && "text-accent")}>{fmt(d, "EEE")}<br /><span className="tabular">{fmt(d, "d")}</span></th>)}
                  <th className="px-3 py-2.5 text-right font-medium">{tr("Streak")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {data.habits.map((h) => {
                  const st = habitStats(h, h.counts);
                  const target = h.frequency === "DAILY" ? h.targetPerPeriod : 1;
                  return (
                    <tr key={h.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 place-items-center rounded-lg text-base" style={{ background: `${h.color}22` }}>{h.icon}</span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{h.title}</p>
                            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                              <span>{h.unit === "times" ? `${h.targetPerPeriod}×` : `${h.targetPerPeriod} ${tr(h.unit)}`} / {h.frequency === "DAILY" ? tr("day") : tr("week")}</span>
                              {h.frequency === "WEEKLY" && <span>· {tr("{a}/{b} this week", { a: st.doneThisWeek ?? 0, b: h.targetPerPeriod })}</span>}
                              {h.reminderTime && <span className="inline-flex items-center gap-0.5"><Bell className="size-3" />{h.reminderTime}</span>}
                              {h.goal && <Link href={`/goals/${h.goal.id}`} className="inline-flex items-center gap-0.5 hover:text-accent"><Target className="size-3" />{h.goal.title}</Link>}
                            </p>
                          </div>
                        </div>
                      </td>
                      {days.map((d) => {
                        const c = h.counts[dayKey(d)] ?? 0;
                        const full = c >= target;
                        return (
                          <td key={d.toISOString()} className="py-2.5 text-center">
                            <button onClick={() => tap(h, d)} disabled={tab === "archived"}
                              onContextMenu={(e) => { e.preventDefault(); if (c > 0) setCount(h, dayKey(d), c - 1); }}
                              aria-label={`${h.title} · ${fmt(d, "EEEE")}: ${c}/${target}`}
                              className={cn("mx-auto grid size-8 place-items-center rounded-lg border text-xs font-semibold transition-all active:scale-95", full ? "border-transparent text-white" : c > 0 ? "border-dashed" : "border-border hover:border-border-strong")}
                              style={full ? { background: h.color } : c > 0 ? { borderColor: h.color, color: h.color } : undefined}>
                              {full ? "✓" : c > 0 ? `${c}/${target}` : ""}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn("inline-flex items-center gap-1 font-semibold tabular", st.streak ? "text-warning" : "text-muted")}><Flame className="size-4" />{st.streak}</span>
                      </td>
                      <td className="pr-2">
                        <Popover align="end" trigger={({ toggle }) => <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={tr("Habit actions")}><MoreHorizontal className="size-4" /></Button>}>
                          {(close) => (
                            <>
                              <MenuItem icon={<Pencil />} onClick={() => { close(); setEditing(h); }}>{tr("Edit")}</MenuItem>
                              <MenuItem icon={<Archive />} onClick={async () => { close(); await patch(`/api/habits/${h.id}`, { archived: tab === "active" }); mutate(); toast.success(tab === "active" ? "Archived" : "Restored"); }}>{tab === "active" ? tr("Archive") : tr("Restore")}</MenuItem>
                              <MenuSeparator />
                              <MenuItem icon={<Trash2 />} danger onClick={async () => {
                                close();
                                if (!(await confirm({ title: tr("Delete “{title}”?", { title: h.title }), body: tr("All completion history is deleted permanently. Archive it instead to keep the history."), confirmLabel: tr("Delete"), danger: true }))) return;
                                await del(`/api/habits/${h.id}`); mutate(); toast.success(tr("Habit deleted"));
                              }}>{tr("Delete")}</MenuItem>
                            </>
                          )}
                        </Popover>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-border px-4 py-2 text-xs text-muted">{tr("Click a day to log a completion (click again to add more / reset). Right-click to subtract.")}</p>
          </Card>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{tr("Statistics")}</h2>
            <Tabs value={period} onChange={setPeriod} items={[{ value: "week", label: tr("12 weeks") }, { value: "month", label: tr("Year") }]} />
          </div>
          <div data-tour="habits-stats" className="grid gap-4 md:grid-cols-2">
            {data.habits.map((h) => <HabitStatsCard key={h.id} habit={h} period={period} />)}
          </div>
        </>
      )}
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={tr("Edit habit")}>
        {editing && <HabitForm habit={editing} onDone={() => { setEditing(null); mutate(); }} onCancel={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}

function HabitStatsCard({ habit: h, period }: { habit: Habit; period: "week" | "month" }) {
  const st = habitStats(h, h.counts);
  const target = h.frequency === "DAILY" ? h.targetPerPeriod : 1;
  const weeks = period === "week" ? 12 : 52;
  const start = useMemo(() => { const d = addDays(new Date(), -(weeks * 7 - 1)); const dow = (d.getDay() + 6) % 7; return addDays(d, -dow); }, [weeks]);
  const cols = Array.from({ length: weeks + 1 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
  const today = new Date();
  const total = Object.values(h.counts).reduce((a, b) => a + b, 0);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span>{h.icon}</span>
        <p className="flex-1 truncate font-medium">{h.title}</p>
        <PlaceOnMap type="habit" id={h.id} size="xs" label={tr("Map")} />
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        <Stat label={tr("Streak")} value={st.streak} icon={<Flame className="size-3.5 text-warning" />} />
        <Stat label={tr("Best")} value={st.best} icon={<Trophy className="size-3.5 text-amber-500" />} />
        <Stat label={h.frequency === "DAILY" ? tr("7 days") : tr("This wk")} value={`${Math.min(100, st.rate7)}%`} />
        <Stat label={h.frequency === "DAILY" ? tr("30 days") : tr("4 weeks")} value={`${st.rate30}%`} />
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]" role="img" aria-label={tr("{n} {unit} logged in total", { n: total, unit: tr(h.unit) })}>
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((d) => {
                const k = dayKey(d);
                const c = h.counts[k] ?? 0;
                const r = Math.min(1, c / target);
                const future = d > today;
                return <span key={k} title={`${fmt(d, "EEE d MMM yyyy")}: ${c}`} className="size-[11px] rounded-[3px]"
                  style={{ background: future ? "transparent" : r ? `color-mix(in oklab, ${h.color} ${25 + r * 75}%, var(--surface-2))` : "var(--surface-3)" }} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">{tr("{n} {unit} logged in total", { n: total, unit: tr(h.unit) })}</p>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <p className="flex items-center justify-center gap-1 text-base font-semibold tabular">{icon}{value}</p>
      <p className="text-[10.5px] text-muted">{label}</p>
    </div>
  );
}
