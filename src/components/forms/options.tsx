"use client";
import { tr, translated } from "@/lib/i18n";
import { useApi } from "@/lib/client/api";
import type { Folder, Goal, Project } from "@/lib/client/types";
import { Select } from "@/components/ui/input";

export function FolderSelect({ value, onChange, allowNone = true, noneLabel = "No folder" }: { value: string | null | undefined; onChange: (v: string | null) => void; allowNone?: boolean; noneLabel?: string }) {
  const { data } = useApi<{ folders: Folder[] }>("/api/folders");
  // Indent nested folders.
  const rows: { f: Folder; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => data?.folders.filter((f) => f.parentId === parent).forEach((f) => { rows.push({ f, depth }); walk(f.id, depth + 1); });
  walk(null, 0);
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label={tr("Folder")}>
      {allowNone && <option value="">{tr(noneLabel)}</option>}
      {rows.map(({ f, depth }) => <option key={f.id} value={f.id}>{"  ".repeat(depth)}{f.icon} {f.name}</option>)}
    </Select>
  );
}

export function GoalSelect({ value, onChange, noneLabel = "No goal", exclude }: { value: string | null | undefined; onChange: (v: string | null) => void; noneLabel?: string; exclude?: string }) {
  const { data } = useApi<{ goals: Goal[] }>("/api/goals");
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label={tr("Goal")}>
      <option value="">{tr(noneLabel)}</option>
      {data?.goals.filter((g) => g.id !== exclude).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
    </Select>
  );
}

export function ProjectSelect({ value, onChange, noneLabel = "No project" }: { value: string | null | undefined; onChange: (v: string | null) => void; noneLabel?: string }) {
  const { data } = useApi<{ projects: Project[] }>("/api/projects");
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label={tr("Project")}>
      <option value="">{tr(noneLabel)}</option>
      {data?.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
    </Select>
  );
}

export const PRIORITY_LABEL: Record<string, string> = translated({ LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" });
export const PRIORITY_COLOR: Record<string, string> = { LOW: "#64748b", MEDIUM: "#3b82f6", HIGH: "#f59e0b", URGENT: "#ef4444" };
export const RECURRENCE_LABEL: Record<string, string> = translated({ NONE: "Does not repeat", DAILY: "Every day", WEEKDAYS: "Every weekday", WEEKLY: "Every week", MONTHLY: "Every month" });
