"use client";
import { useState } from "react";
import { invalidate, patch, post } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import { fromDateInput, toDateInput, toDateTimeInput } from "@/lib/client/format";
import type { Task } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/misc";
import { GoalSelect, PRIORITY_LABEL, ProjectSelect, RECURRENCE_LABEL } from "./options";

export type TaskDraft = Partial<Pick<Task, "title" | "description" | "status" | "priority" | "tags" | "dueDate" | "scheduledStart" | "scheduledEnd" | "estimateMinutes" | "actualMinutes" | "recurrence" | "projectId" | "goalId" | "milestoneId">>;

export function TaskForm({ task, defaults, onDone, onCancel }: { task?: Task; defaults?: TaskDraft; onDone: (t: Task) => void; onCancel?: () => void }) {
  const init = { ...defaults, ...task };
  const [f, setF] = useState({
    title: init.title ?? "",
    description: init.description ?? "",
    priority: init.priority ?? "MEDIUM",
    status: init.status ?? "TODO",
    tags: init.tags ?? [],
    due: toDateInput(init.dueDate),
    start: toDateTimeInput(init.scheduledStart),
    end: toDateTimeInput(init.scheduledEnd),
    estimate: init.estimateMinutes ? String(init.estimateMinutes) : "",
    actual: init.actualMinutes ? String(init.actualMinutes) : "",
    recurrence: init.recurrence ?? "NONE",
    projectId: init.projectId ?? null,
    goalId: init.goalId ?? null,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!f.title.trim()) return;
    let scheduledEnd = f.end ? new Date(f.end).toISOString() : null;
    const scheduledStart = f.start ? new Date(f.start).toISOString() : null;
    if (scheduledStart && !scheduledEnd) scheduledEnd = new Date(new Date(f.start).getTime() + (Number(f.estimate) || 60) * 60000).toISOString();
    if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) return toast.error(new Error("Time block must end after it starts"));
    const body = {
      title: f.title.trim(), description: f.description, priority: f.priority, status: f.status, tags: f.tags,
      dueDate: fromDateInput(f.due), scheduledStart, scheduledEnd,
      estimateMinutes: f.estimate ? Number(f.estimate) : null, actualMinutes: f.actual ? Number(f.actual) : null,
      recurrence: f.recurrence, projectId: f.projectId, goalId: f.goalId, milestoneId: init.milestoneId ?? null,
    };
    setBusy(true);
    try {
      const { task: saved } = task ? await patch<{ task: Task }>(`/api/tasks/${task.id}`, body) : await post<{ task: Task }>("/api/tasks", body);
      invalidate("/api/tasks", "/api/dashboard", "/api/goals", "/api/projects", "/api/events");
      toast.success(task ? "Task updated" : "Task created");
      onDone(saved);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Field label="Title"><Input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Study React for 1 hour" /></Field>
      <Field label="Description"><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Details, links, acceptance criteria…" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Project"><ProjectSelect value={f.projectId} onChange={(v) => set("projectId", v)} /></Field>
        <Field label="Goal"><GoalSelect value={f.goalId} onChange={(v) => set("goalId", v)} /></Field>
        <Field label="Priority">
          <Select value={f.priority} onChange={(e) => set("priority", e.target.value as typeof f.priority)}>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => set("status", e.target.value as typeof f.status)}>
            <option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option>
          </Select>
        </Field>
        <Field label="Due date"><Input type="date" value={f.due} onChange={(e) => set("due", e.target.value)} /></Field>
        <Field label="Repeat">
          <Select value={f.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
            {Object.entries(RECURRENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Time block start"><Input type="datetime-local" value={f.start} onChange={(e) => set("start", e.target.value)} /></Field>
        <Field label="Time block end"><Input type="datetime-local" value={f.end} onChange={(e) => set("end", e.target.value)} /></Field>
        <Field label="Estimate (minutes)"><Input type="number" min={0} value={f.estimate} onChange={(e) => set("estimate", e.target.value)} placeholder="60" /></Field>
        <Field label="Actual time (minutes)"><Input type="number" min={0} value={f.actual} onChange={(e) => set("actual", e.target.value)} /></Field>
      </div>
      <Field label="Tags"><TagInput value={f.tags} onChange={(v) => set("tags", v)} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary" loading={busy} disabled={!f.title.trim()}>{task ? "Save" : "Create task"}</Button>
      </div>
    </form>
  );
}
