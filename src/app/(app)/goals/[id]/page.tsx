"use client";
import { tr } from "@/lib/i18n";
import { reportGoals, useCelebrate, type GoalDelta } from "@/lib/client/celebrate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, CalendarClock, FolderTree, GripVertical, MoreHorizontal, Pencil, Plus, Repeat, Sparkles, Trash2, Workflow, X } from "lucide-react";
import { del, invalidate, patch, post, useApi } from "@/lib/client/api";
import { confirm, toast, useUI } from "@/lib/client/store";
import { useMe } from "@/lib/client/hooks";
import { relDay, time } from "@/lib/client/format";
import type { AiSuggestion, Goal, Task } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Card, MenuItem, MenuSeparator, PageSkeleton, Popover, ProgressRing } from "@/components/ui/misc";
import { GoalForm, GOAL_STATUS_LABEL } from "@/components/forms/goal-form";
import { PRIORITY_COLOR } from "@/components/forms/options";
import { TaskRow } from "@/components/tasks/task-row";
import { QuickAddTask } from "@/components/tasks/quick-add";
import { PlaceOnMap } from "@/components/shared/place-on-map";
import { SuggestionView } from "@/components/ai/suggestion-view";
import { RELATION_META, type Relation } from "@/components/canvas/types";

interface Detail {
  goal: Goal;
  tasks: Task[];
  nodes: { id: string; mapId: string; map: { title: string } }[];
  connected: { relation: Relation; node: { id: string; title: string; kind: string; mapId: string } }[];
  dependsOn: { id: string; title: string; status: string }[];
  dependents: { id: string; title: string; status: string }[];
  events: { id: string; title: string; start: string; end: string; recurrence: string }[];
}

export default function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, mutate } = useApi<Detail>(`/api/goals/${id}`);
  const { data: allGoals } = useApi<{ goals: Goal[] }>("/api/goals");
  const { data: me } = useMe();
  const { openCreate } = useUI();
  const [editing, setEditing] = useState(false);
  const [ms, setMs] = useState("");
  const [ai, setAi] = useState<AiSuggestion | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  if (error) return <p className="py-20 text-center text-sm text-muted">{tr("Goal not found.")}{" "}<Link href="/goals" className="text-accent">{tr("Back")}</Link></p>;
  if (!data) return <PageSkeleton />;
  const g = data.goal;
  const refresh = () => { mutate(); invalidate("/api/goals", "/api/dashboard"); };
  const run = async (fn: () => Promise<unknown>, msg?: string) => { try { await fn(); refresh(); if (msg) toast.success(msg); } catch (e) { toast.error(e); } };
  const addMilestone = () => { if (ms.trim()) { run(() => post(`/api/goals/${g.id}/milestones`, { title: ms.trim() })); setMs(""); } };
  const breakdown = async () => {
    setAiBusy(true);
    try { const { suggestion } = await post<{ suggestion: AiSuggestion }>("/api/ai/breakdown", { goalId: g.id }); setAi(suggestion); } catch (e) { toast.error(e); } finally { setAiBusy(false); }
  };
  const aiOn = !!(me?.aiAvailable && me.user.aiEnabled);

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => router.push("/goals")}><ArrowLeft className="size-4" />{" "}{tr("Goals")}</Button>
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start">
        <ProgressRing value={g.progress} size={88} stroke={8} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{g.title}</h1>
            <Badge>{GOAL_STATUS_LABEL[g.status]}</Badge>
            <Badge color={PRIORITY_COLOR[g.priority]}>{g.priority.toLowerCase()} priority</Badge>
            {g.category && <Badge>{g.category}</Badge>}
          </div>
          {g.description && <p className="mt-1.5 max-w-3xl whitespace-pre-line text-sm text-text-2">{g.description}</p>}
          <p className="mt-2 text-sm text-muted">
            {g.startDate && <>{tr("Started")}{" "}{relDay(g.startDate)} · </>}
            {g.targetDate ? <>{tr("Target")}{" "}{relDay(g.targetDate)}</> : tr("No target date")} ·{" "}
            {g.autoProgress ? tr("Progress from {m} milestones + {t} tasks", { m: g.milestones.length, t: g.taskCount }) : tr("Manual progress")}
          </p>
        </div>
        <div data-tour="goal-actions" className="flex flex-wrap gap-2">
          {aiOn && <Button size="sm" variant="soft" loading={aiBusy} onClick={breakdown}>{!aiBusy && <Sparkles className="size-4" />}{" "}{tr("Break down")}</Button>}
          <PlaceOnMap type="goal" id={g.id} label={tr("Visualize")} />
          <Button size="sm" onClick={() => setEditing(true)}><Pencil className="size-3.5" />{" "}{tr("Edit")}</Button>
          <Popover align="end" trigger={({ toggle }) => <Button size="icon-sm" variant="ghost" onClick={toggle} aria-label={tr("More")}><MoreHorizontal className="size-4" /></Button>}>
            {(close) => (
              <>
                {g.status !== "COMPLETED" && <MenuItem onClick={() => { close(); run(() => patch(`/api/goals/${g.id}`, { status: "COMPLETED" }).then(() => useCelebrate.getState().celebrate(g.id))); }}>{tr("Mark as achieved")}</MenuItem>}
                {g.status !== "ON_HOLD" && <MenuItem onClick={() => { close(); run(() => patch(`/api/goals/${g.id}`, { status: "ON_HOLD" }), "Put on hold"); }}>{tr("Put on hold")}</MenuItem>}
                {g.status !== "ACTIVE" && <MenuItem onClick={() => { close(); run(() => patch(`/api/goals/${g.id}`, { status: "ACTIVE" }), "Reactivated"); }}>{tr("Mark as active")}</MenuItem>}
                <MenuSeparator />
                <MenuItem icon={<Trash2 />} danger onClick={async () => {
                  close();
                  if (!(await confirm({ title: tr("Delete goal “{title}”?", { title: g.title }), body: tr("Milestones are deleted. Tasks, projects and habits linked to it are kept but unlinked."), confirmLabel: tr("Delete goal"), danger: true }))) return;
                  try { await del(`/api/goals/${g.id}`); invalidate("/api/goals", "/api/dashboard"); router.push("/goals"); toast.success(tr("Goal deleted")); } catch (e) { toast.error(e); }
                }}>{tr("Delete goal")}</MenuItem>
              </>
            )}
          </Popover>
        </div>
      </div>

      {ai && <div className="mb-6"><SuggestionView s={ai} onResolved={() => { setAi(null); refresh(); }} /></div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card data-tour="goal-milestones" className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{tr("Milestones")}{" "}<span className="font-normal text-muted">{g.milestones.filter((m) => m.done).length}/{g.milestones.length}</span></h2>
            </div>
            <ol className="space-y-1">
              {g.milestones.map((m, i) => (
                <li key={m.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                  <GripVertical className="size-3.5 text-muted opacity-0 group-hover:opacity-60" />
                  <Checkbox checked={m.done} label={m.title} onChange={(done) => run(() => patch<{ goals?: GoalDelta[] }>(`/api/milestones/${m.id}`, { done }).then((r) => reportGoals(r.goals)), done ? tr("Milestone reached: {title}", { title: m.title }) : undefined)} />
                  <span className={`flex-1 text-sm ${m.done ? "text-muted line-through" : ""}`}><span className="mr-1.5 text-xs text-muted tabular">{i + 1}.</span>{m.title}</span>
                  {m.dueDate && <span className="text-xs text-muted">{relDay(m.dueDate)}</span>}
                  <button aria-label={tr("Delete milestone")} className="text-muted opacity-0 hover:text-danger group-hover:opacity-100" onClick={async () => {
                    if (await confirm({ title: tr("Delete milestone?"), body: m.title, confirmLabel: tr("Delete"), danger: true })) run(() => del(`/api/milestones/${m.id}`));
                  }}><X className="size-3.5" /></button>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex gap-2">
              <Input value={ms} onChange={(e) => setMs(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMilestone()} placeholder={tr("Add a milestone…")} className="h-8" />
              <Button size="sm" onClick={addMilestone} disabled={!ms.trim()}><Plus className="size-4" /></Button>
            </div>
          </Card>

          <Card data-tour="goal-tasks" className="p-4">
            <h2 className="mb-3 text-sm font-semibold">{tr("Tasks")}{" "}<span className="font-normal text-muted">{g.doneTaskCount}/{g.taskCount}</span></h2>
            <QuickAddTask defaults={{ goalId: g.id }} onAdded={() => mutate()} placeholder={tr("Add a task for this goal…")} />
            <div className="-mx-2 mt-2">
              {data.tasks.map((t) => <TaskRow key={t.id} task={t} onChanged={() => mutate()} />)}
              {!data.tasks.length && <p className="px-2 py-3 text-sm text-muted">{tr("Daily actions connect to this goal here. Add tasks directly or via linked projects.")}</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {(g.motivation || g.successCriteria) && (
            <Card className="space-y-3 p-4 text-sm">
              {g.motivation && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{tr("Why it matters")}</p><p className="mt-1 whitespace-pre-line">{g.motivation}</p></div>}
              {g.successCriteria && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{tr("Success looks like")}</p><p className="mt-1 whitespace-pre-line">{g.successCriteria}</p></div>}
            </Card>
          )}
          <Card data-tour="goal-side" className="space-y-4 p-4 text-sm">
            <Side title={tr("Projects")} action={<button className="text-xs text-accent" onClick={() => openCreate("project", { goalId: g.id })}>{tr("+ New")}</button>}>
              {g.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-2 py-0.5 hover:underline">
                  <FolderTree className="size-3.5" style={{ color: p.color }} /><span className="flex-1 truncate">{p.title}</span><span className="text-xs text-muted">{p.doneCount}/{p.taskCount}</span>
                </Link>
              ))}
              {!g.projects.length && <Empty>{tr("No projects yet.")}</Empty>}
            </Side>
            <Side title={tr("Supporting habits")} action={<button className="text-xs text-accent" onClick={() => openCreate("habit", { goalId: g.id })}>{tr("+ New")}</button>}>
              {g.habits.map((h) => <Link key={h.id} href="/habits" className="flex items-center gap-2 py-0.5 hover:underline"><Repeat className="size-3.5 text-muted" />{h.icon} {h.title}</Link>)}
              {!g.habits.length && <Empty>{tr("No habits linked.")}</Empty>}
            </Side>
            <Side title={tr("Scheduled activities")}>
              {data.events.map((e) => <p key={e.id} className="flex items-center gap-2 py-0.5"><CalendarClock className="size-3.5 text-muted" /><span className="flex-1 truncate">{e.title}</span><span className="text-xs text-muted">{e.recurrence !== "NONE" ? e.recurrence.toLowerCase() : relDay(e.start)} {time(e.start)}</span></p>)}
              {!data.events.length && <Empty>{tr("Link calendar events to this goal to see time invested.")}</Empty>}
            </Side>
            <Side title={tr("Depends on")}>
              {data.dependsOn.map((d) => (
                <div key={d.id} className="flex items-center gap-2 py-0.5">
                  <Link href={`/goals/${d.id}`} className="flex-1 truncate hover:underline">{d.status === "COMPLETED" ? "✓" : "○"} {d.title}</Link>
                  <button aria-label={tr("Remove dependency")} className="text-muted hover:text-danger" onClick={() => run(() => patch(`/api/goals/${g.id}`, { dependsOn: data.dependsOn.filter((x) => x.id !== d.id).map((x) => x.id) }))}><X className="size-3.5" /></button>
                </div>
              ))}
              <Select className="mt-1 h-8" value="" onChange={(e) => e.target.value && run(() => patch(`/api/goals/${g.id}`, { dependsOn: [...data.dependsOn.map((x) => x.id), e.target.value] }))} aria-label={tr("Add goal dependency")}>
                <option value="">{tr("+ Add dependency…")}</option>
                {allGoals?.goals.filter((x) => x.id !== g.id && !data.dependsOn.some((d) => d.id === x.id)).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </Select>
              {data.dependents.length > 0 && <p className="mt-1.5 text-xs text-muted">{tr("Enables:")}{" "}{data.dependents.map((d) => d.title).join(", ")}</p>}
            </Side>
            <Side title={tr("Connected thoughts")}>
              {data.connected.map((c, i) => (
                <Link key={i} href={`/maps/${c.node.mapId}?node=${c.node.id}`} className="flex items-center gap-2 py-0.5 hover:underline">
                  <span className="text-[11px] font-medium" style={{ color: RELATION_META[c.relation].color }}>{RELATION_META[c.relation].label}</span>
                  <span className="truncate">{c.node.title || tr("Untitled")}</span>
                </Link>
              ))}
              {data.nodes.map((n) => <Link key={n.id} href={`/maps/${n.mapId}?node=${n.id}`} className="flex items-center gap-2 py-0.5 text-accent hover:underline"><Workflow className="size-3.5" />{tr("On “{title}”", { title: n.map.title })}</Link>)}
              {!data.connected.length && !data.nodes.length && <Empty>{tr("Place this goal on a mind map to connect it with thoughts and other goals.")}</Empty>}
            </Side>
          </Card>
        </div>
      </div>
      <Dialog open={editing} onClose={() => setEditing(false)} title={tr("Edit goal")}>
        <GoalForm goal={g} onDone={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />
      </Dialog>
    </>
  );
}

function Side({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>{action}</div>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}
