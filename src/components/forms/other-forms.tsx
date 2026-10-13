"use client";
import { getLocale, tr, translated } from "@/lib/i18n";
import { useState } from "react";
import { invalidate, patch, post, useApi } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import { fromDateInput, toDateInput, toDateTimeInput } from "@/lib/client/format";
import type { CalEvent, Goal, Habit, Project } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/misc";
import { FolderSelect, GoalSelect, RECURRENCE_LABEL } from "./options";
import { cn } from "@/lib/utils";

export const PROJECT_STATUS_LABEL: Record<string, string> = translated({ PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed" });

export function ProjectForm({ project, defaults, onDone, onCancel }: { project?: Project; defaults?: Partial<Project>; onDone: (p: Project) => void; onCancel?: () => void }) {
  const init = { ...defaults, ...project };
  const [f, setF] = useState({
    title: init.title ?? "", description: init.description ?? "", status: init.status ?? "ACTIVE", color: init.color ?? "#6366f1",
    goalId: init.goalId ?? null, folderId: init.folderId ?? null, startDate: toDateInput(init.startDate), dueDate: toDateInput(init.dueDate),
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    const body = { ...f, title: f.title.trim(), startDate: fromDateInput(f.startDate), dueDate: fromDateInput(f.dueDate) };
    try {
      const { project: saved } = project ? await patch<{ project: Project }>(`/api/projects/${project.id}`, body) : await post<{ project: Project }>("/api/projects", body);
      invalidate("/api/projects", "/api/goals", "/api/dashboard", "/api/folders");
      toast.success(project ? "Project updated" : "Project created");
      onDone(saved);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Field label={tr("Project name")}><Input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={tr("e.g. Learn programming")} /></Field>
      <Field label={tr("Description")}><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tr("Supports goal")}><GoalSelect value={f.goalId} onChange={(v) => set("goalId", v)} /></Field>
        <Field label={tr("Folder")}><FolderSelect value={f.folderId} onChange={(v) => set("folderId", v)} /></Field>
        <Field label={tr("Start")}><Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label={tr("Deadline")}><Input type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></Field>
        <Field label={tr("Status")}>
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={tr("Color")}><ColorPicker value={f.color} onChange={(c) => set("color", c)} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="ghost" onClick={onCancel}>{tr("Cancel")}</Button>}
        <Button type="submit" variant="primary" loading={busy} disabled={!f.title.trim()}>{project ? tr("Save") : tr("Create project")}</Button>
      </div>
    </form>
  );
}

const HABIT_ICONS = ["✨", "🏃", "📚", "💧", "🧘", "💰", "✍️", "🗣️", "🥗", "😴", "🎸", "💻"];

export function HabitForm({ habit, defaults, onDone, onCancel }: { habit?: Habit; defaults?: Partial<Habit>; onDone: (h: Habit) => void; onCancel?: () => void }) {
  const init = { ...defaults, ...habit };
  const [f, setF] = useState({
    title: init.title ?? "", description: init.description ?? "", icon: init.icon ?? "✨", color: init.color ?? "#10b981",
    frequency: init.frequency ?? "DAILY", targetPerPeriod: init.targetPerPeriod ?? 1, unit: init.unit ?? "times",
    reminderTime: init.reminderTime ?? "", goalId: init.goalId ?? null,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    const body = { ...f, title: f.title.trim(), targetPerPeriod: Number(f.targetPerPeriod) || 1, reminderTime: f.reminderTime || null };
    try {
      const { habit: saved } = habit ? await patch<{ habit: Habit }>(`/api/habits/${habit.id}`, body) : await post<{ habit: Habit }>("/api/habits", body);
      invalidate("/api/habits", "/api/dashboard", "/api/goals");
      toast.success(habit ? "Habit updated" : "Habit created");
      onDone(saved);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Field label={tr("Habit")}><Input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={tr("e.g. Read 20 pages")} /></Field>
      <Field label={tr("Icon")}>
        <div className="flex flex-wrap gap-1">
          {HABIT_ICONS.map((i) => (
            <button type="button" key={i} onClick={() => set("icon", i)} className={cn("size-9 rounded-lg text-lg hover:bg-surface-2", f.icon === i && "bg-accent-soft ring-1 ring-accent")}>{i}</button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={tr("Frequency")}>
          <Select value={f.frequency} onChange={(e) => set("frequency", e.target.value as "DAILY" | "WEEKLY")}>
            <option value="DAILY">{tr("Daily")}</option><option value="WEEKLY">{tr("Weekly")}</option>
          </Select>
        </Field>
        <Field label={f.frequency === "DAILY" ? tr("Target / day") : tr("Target / week")}><Input type="number" min={1} max={100} value={f.targetPerPeriod} onChange={(e) => set("targetPerPeriod", Number(e.target.value))} /></Field>
        <Field label={tr("Unit")}><Input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="times" /></Field>
        <Field label={tr("Reminder")}><Input type="time" value={f.reminderTime} onChange={(e) => set("reminderTime", e.target.value)} /></Field>
        <Field label={tr("Supports goal")} className="col-span-2"><GoalSelect value={f.goalId} onChange={(v) => set("goalId", v)} /></Field>
      </div>
      <Field label={tr("Color")}><ColorPicker value={f.color} onChange={(c) => set("color", c)} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="ghost" onClick={onCancel}>{tr("Cancel")}</Button>}
        <Button type="submit" variant="primary" loading={busy} disabled={!f.title.trim()}>{habit ? tr("Save") : tr("Create habit")}</Button>
      </div>
    </form>
  );
}

export function EventForm({ event, defaults, onDone, onCancel, onDelete }: { event?: CalEvent; defaults?: Partial<CalEvent>; onDone: (e: CalEvent) => void; onCancel?: () => void; onDelete?: () => void }) {
  const init = { ...defaults, ...event };
  const start0 = init.start ? new Date(init.start) : nextHalfHour();
  const end0 = init.end ? new Date(init.end) : new Date(start0.getTime() + 60 * 60000);
  const [f, setF] = useState({
    title: init.title ?? "", description: init.description ?? "", start: toDateTimeInput(start0), end: toDateTimeInput(end0), color: init.color ?? "#6366f1",
    recurrence: init.recurrence ?? "NONE", recurUntil: toDateInput(init.recurUntil), goalIds: (init.goals ?? []).map((g) => g.id), reminder: "",
  });
  const { data: goals } = useApi<{ goals: Goal[] }>("/api/goals");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (new Date(f.end) <= new Date(f.start)) return toast.error(new Error("End must be after start"));
    setBusy(true);
    const body = {
      title: f.title.trim(), description: f.description, start: new Date(f.start).toISOString(), end: new Date(f.end).toISOString(), color: f.color,
      recurrence: f.recurrence, recurUntil: fromDateInput(f.recurUntil), goalIds: f.goalIds,
      ...(event ? {} : { reminderMinutes: f.reminder === "" ? null : Number(f.reminder) }),
    };
    try {
      const { event: saved } = event ? await patch<{ event: CalEvent }>(`/api/events/${event.id}`, body) : await post<{ event: CalEvent }>("/api/events", body);
      invalidate("/api/events", "/api/dashboard");
      toast.success(event ? "Event updated" : "Event added");
      onDone(saved);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Field label={tr("Title")}><Input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={tr("e.g. Morning run")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tr("Start")}><Input type="datetime-local" value={f.start} onChange={(e) => { const d = new Date(f.end).getTime() - new Date(f.start).getTime(); set("start", e.target.value); if (e.target.value) set("end", toDateTimeInput(new Date(new Date(e.target.value).getTime() + Math.max(d, 15 * 60000)))); }} /></Field>
        <Field label={tr("End")}><Input type="datetime-local" value={f.end} onChange={(e) => set("end", e.target.value)} /></Field>
        <Field label={tr("Repeat")}>
          <Select value={f.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
            {Object.entries(RECURRENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        {f.recurrence !== "NONE" ? (
          <Field label={tr("Repeat until")}><Input type="date" value={f.recurUntil} onChange={(e) => set("recurUntil", e.target.value)} /></Field>
        ) : !event ? (
          <Field label={tr("Reminder")}>
            <Select value={f.reminder} onChange={(e) => set("reminder", e.target.value)}>
              <option value="">{tr("None")}</option><option value="0">{tr("At start")}</option><option value="10">{tr("10 min before")}</option><option value="30">{tr("30 min before")}</option><option value="60">{tr("1 hour before")}</option>
            </Select>
          </Field>
        ) : <div />}
      </div>
      <Field label={tr("Contributes to goals")} hint={tr("An activity can support several goals (e.g. a walk with a podcast → fitness and learning).")}>
        <div className="flex flex-wrap gap-1.5">
          {goals?.goals.map((g) => {
            const on = f.goalIds.includes(g.id);
            return (
              <button type="button" key={g.id} onClick={() => set("goalIds", on ? f.goalIds.filter((x) => x !== g.id) : [...f.goalIds, g.id])}
                className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-accent bg-accent-soft text-accent" : "border-border text-text-2 hover:bg-surface-2")}>
                {g.title}
              </button>
            );
          })}
          {!goals?.goals.length && <span className="text-xs text-muted">{tr("No goals yet.")}</span>}
        </div>
      </Field>
      <Field label={tr("Notes")}><Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label={tr("Color")}><ColorPicker value={f.color} onChange={(c) => set("color", c)} /></Field>
      <div className="flex gap-2 pt-1">
        {onDelete && <Button variant="ghost" className="text-danger" onClick={onDelete}>{tr("Delete")}</Button>}
        <div className="flex-1" />
        {onCancel && <Button variant="ghost" onClick={onCancel}>{tr("Cancel")}</Button>}
        <Button type="submit" variant="primary" loading={busy} disabled={!f.title.trim()}>{event ? tr("Save") : tr("Add event")}</Button>
      </div>
    </form>
  );
}

function nextHalfHour() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

export function MapForm({ defaults, onDone, onCancel }: { defaults?: { folderId?: string | null }; onDone: (id: string) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState("");
  const [folderId, setFolderId] = useState<string | null>(defaults?.folderId ?? null);
  const [template, setTemplate] = useState("");
  const { data } = useApi<{ templates: { id: string; name: string; description: string }[] }>("/api/maps");
  const [busy, setBusy] = useState(false);
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const { map } = await post<{ map: { id: string } }>("/api/maps", { title: title.trim() || undefined, folderId, template: template || undefined, locale: getLocale() });
      invalidate("/api/maps", "/api/folders", "/api/dashboard");
      onDone(map.id);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Field label={tr("Title")}><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("My personal development")} /></Field>
      <Field label={tr("Folder")}><FolderSelect value={folderId} onChange={setFolderId} /></Field>
      <Field label={tr("Start from")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {[{ id: "", name: "Blank canvas", description: tr("A single central thought.") }, ...(data?.templates ?? [])].map((t) => (
            <button type="button" key={t.id} onClick={() => setTemplate(t.id)} className={cn("rounded-xl border p-3 text-left transition-colors", template === t.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2")}>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="mt-0.5 text-xs text-muted leading-snug">{t.description}</p>
            </button>
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="ghost" onClick={onCancel}>{tr("Cancel")}</Button>}
        <Button type="submit" variant="primary" loading={busy}>{tr("Create map")}</Button>
      </div>
    </form>
  );
}

export function FolderForm({ defaults, onDone, onCancel }: { defaults?: { parentId?: string | null }; onDone: (id: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#6366f1");
  const [parentId, setParentId] = useState<string | null>(defaults?.parentId ?? null);
  const [busy, setBusy] = useState(false);
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const { folder } = await post<{ folder: { id: string } }>("/api/folders", { name: name.trim(), icon, color, parentId });
      invalidate("/api/folders");
      onDone(folder.id);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="flex gap-2">
        <Field label={tr("Icon")} className="w-20"><Input value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} className="text-center" /></Field>
        <Field label={tr("Name")} className="flex-1"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Health & Fitness")} /></Field>
      </div>
      <Field label={tr("Inside")}><FolderSelect value={parentId} onChange={setParentId} noneLabel="Top level" /></Field>
      <Field label={tr("Color")}><ColorPicker value={color} onChange={setColor} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="ghost" onClick={onCancel}>{tr("Cancel")}</Button>}
        <Button type="submit" variant="primary" loading={busy} disabled={!name.trim()}>{tr("Create folder")}</Button>
      </div>
    </form>
  );
}
