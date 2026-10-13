"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { invalidate, post } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import { fromDateInput } from "@/lib/client/format";

/** Inline "add a task" input. Supports `!high`, `#tag` and `today`/`tomorrow` shortcuts. */
export function QuickAddTask({ defaults, onAdded, placeholder = "Add a task… (try: Call bank tomorrow !high #finance)" }: { defaults?: Record<string, unknown>; onAdded?: () => void; placeholder?: string }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    let title = v.trim();
    if (!title) return;
    const tags = [...title.matchAll(/(^|\s)#([\p{L}\d_-]+)/gu)].map((m) => m[2].toLowerCase());
    title = title.replace(/(^|\s)#[\p{L}\d_-]+/gu, " ");
    const pr = title.match(/(^|\s)!(low|medium|high|urgent)\b/i);
    if (pr) title = title.replace(pr[0], " ");
    let due: string | null = null;
    const d = title.match(/(^|\s)(today|tomorrow)\b/i);
    if (d) {
      const dt = new Date();
      if (d[2].toLowerCase() === "tomorrow") dt.setDate(dt.getDate() + 1);
      due = fromDateInput(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`);
      title = title.replace(d[0], " ");
    }
    title = title.replace(/\s+/g, " ").trim() || v.trim();
    setBusy(true);
    try {
      await post("/api/tasks", { ...defaults, title, tags, ...(pr ? { priority: pr[2].toUpperCase() } : {}), ...(due ? { dueDate: due } : {}) });
      setV("");
      invalidate("/api/tasks", "/api/dashboard", "/api/goals", "/api/projects");
      onAdded?.();
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface px-3 focus-within:border-accent focus-within:border-solid">
      <Plus className="size-4 text-muted" />
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} disabled={busy} placeholder={placeholder} aria-label="Add a task"
        className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
    </div>
  );
}
