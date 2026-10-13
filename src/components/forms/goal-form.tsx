"use client";
import { tr, translated } from "@/lib/i18n";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { invalidate, patch, post } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import { fromDateInput, toDateInput } from "@/lib/client/format";
import type { Goal } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FolderSelect, PRIORITY_LABEL } from "./options";

export const GOAL_STATUS_LABEL: Record<string, string> = translated({ NOT_STARTED: "Not started", ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed", ABANDONED: "Abandoned" });
export const CATEGORIES = translated(["Health", "Finance", "Education", "Business", "Career", "Personal Development", "Relationships", "Creativity"]);

export function GoalForm({ goal, defaults, onDone, onCancel }: { goal?: Goal; defaults?: Partial<Goal>; onDone: (g: Goal) => void; onCancel?: () => void }) {
  const init = { ...defaults, ...goal };
  const [f, setF] = useState({
    title: init.title ?? "", description: init.description ?? "", category: init.category ?? "", priority: init.priority ?? "MEDIUM",
    status: init.status ?? "ACTIVE", startDate: toDateInput(init.startDate), targetDate: toDateInput(init.targetDate),
    motivation: init.motivation ?? "", successCriteria: init.successCriteria ?? "", autoProgress: init.autoProgress ?? true,
    manualProgress: init.manualProgress ?? 0, folderId: init.folderId ?? null,
  });
  const [milestones, setMilestones] = useState<string[]>(goal ? [] : [""]);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!f.title.trim()) return;
    setBusy(true);
    const body = { ...f, title: f.title.trim(), startDate: fromDateInput(f.startDate), targetDate: fromDateInput(f.targetDate), manualProgress: Number(f.manualProgress) };
    try {
      const { goal: saved } = goal
        ? await patch<{ goal: Goal }>(`/api/goals/${goal.id}`, body)
        : await post<{ goal: Goal }>("/api/goals", { ...body, milestones: milestones.map((m) => m.trim()).filter(Boolean) });
      invalidate("/api/goals", "/api/dashboard");
      toast.success(goal ? "Goal updated" : "Goal created");
      onDone(saved);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Field label={tr("Goal")}><Input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={tr("e.g. Improve physical fitness")} /></Field>
      <Field label={tr("Description")}><Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tr("Category")}>
          <Input list="goal-categories" value={f.category} onChange={(e) => set("category", e.target.value)} placeholder={tr("Health")} />
          <datalist id="goal-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label={tr("Priority")}>
          <Select value={f.priority} onChange={(e) => set("priority", e.target.value as typeof f.priority)}>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label={tr("Start date")}><Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label={tr("Target date")}><Input type="date" value={f.targetDate} onChange={(e) => set("targetDate", e.target.value)} /></Field>
        <Field label={tr("Status")}>
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(GOAL_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label={tr("Folder")}><FolderSelect value={f.folderId} onChange={(v) => set("folderId", v)} /></Field>
      </div>
      <Field label={tr("Why does this matter to you?")}><Textarea rows={2} value={f.motivation} onChange={(e) => set("motivation", e.target.value)} placeholder={tr("Personal motivation")} /></Field>
      <Field label={tr("Success criteria")}><Textarea rows={2} value={f.successCriteria} onChange={(e) => set("successCriteria", e.target.value)} placeholder={tr("How will you know you've achieved it?")} /></Field>
      {!goal && (
        <Field label={tr("Milestones")}>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input id={`milestone-${i}`} aria-label={tr("Milestone {n}", { n: i + 1 })} value={m} onChange={(e) => setMilestones(milestones.map((x, j) => (j === i ? e.target.value : x)))} placeholder={tr("Milestone {n}", { n: i + 1 })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setMilestones([...milestones, ""]); } }} />
                <Button variant="ghost" size="icon" aria-label={tr("Remove milestone")} onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}><X className="size-4" /></Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setMilestones([...milestones, ""])}><Plus className="size-4" />{" "}{tr("Add milestone")}</Button>
          </div>
        </Field>
      )}
      <div className="rounded-xl border border-border p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.autoProgress} onChange={(e) => set("autoProgress", e.target.checked)} className="accent-[var(--accent)]" />
          {tr("Calculate progress automatically from milestones and tasks")}
        </label>
        {!f.autoProgress && (
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} value={f.manualProgress} onChange={(e) => set("manualProgress", Number(e.target.value))} className="flex-1 accent-[var(--accent)]" aria-label={tr("Manual progress")} />
            <span className="w-10 text-right text-sm tabular">{f.manualProgress}%</span>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="ghost" onClick={onCancel}>{tr("Cancel")}</Button>}
        <Button type="submit" variant="primary" loading={busy} disabled={!f.title.trim()}>{goal ? tr("Save") : tr("Create goal")}</Button>
      </div>
    </form>
  );
}
