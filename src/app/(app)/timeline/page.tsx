"use client";
import { trActivity } from "@/lib/i18n/activity";
import { fmt } from "@/lib/client/format";
import { tr, translated } from "@/lib/i18n";
import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import { isSameDay } from "date-fns";
import { History, Sparkles } from "lucide-react";
import { api } from "@/lib/client/api";
import { useWorkspace } from "@/lib/client/store";
import type { ActivityItem } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageSkeleton, Tabs } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

const FILTERS = translated([
  { value: "", label: "Everything" }, { value: "thought", label: "Thoughts" }, { value: "note", label: "Notes" }, { value: "goal", label: "Goals" },
  { value: "task", label: "Tasks" }, { value: "map", label: "Maps" }, { value: "habit", label: "Habits" },
]);

/** Timeline of ideas: how thoughts, plans and progress evolved over time. */
export default function TimelinePage() {
  const ws = useWorkspace((s) => s.id);
  const [type, setType] = useState("");
  const { data, size, setSize, isValidating } = useSWRInfinite<{ activity: ActivityItem[] }>(
    (i, prev) => (prev && prev.activity.length < 50 ? null : ["/api/activity", ws, type, i === 0 ? "" : prev!.activity[prev!.activity.length - 1].createdAt]),
    ([p, w, t, before]: [string, string, string, string]) => api(`${p}?limit=50${t ? `&type=${t}` : ""}${before ? `&before=${encodeURIComponent(before)}` : ""}`, { ws: w }),
  );
  const items = data?.flatMap((d) => d.activity) ?? [];
  const hasMore = data && data[data.length - 1].activity.length === 50;
  return (
    <>
      <PageHeader title={tr("Timeline")} description={tr("A chronological record of how your thoughts and plans evolved.")} actions={<Tabs value={type} onChange={setType} items={FILTERS} />} />
      {!data ? <PageSkeleton /> : !items.length ? <EmptyState icon={<History className="size-6" />} title={tr("Nothing here yet")} body={tr("Captured thoughts, created goals, completed tasks and more will appear here.")} /> : (
        <Card className="p-5">
          <ol className="relative ml-2 border-l border-border">
            {items.map((a, i) => {
              const newDay = i === 0 || !isSameDay(new Date(a.createdAt), new Date(items[i - 1].createdAt));
              return (
                <li key={a.id} className="mb-3 ml-5">
                  {newDay && <p className="-ml-5 mb-2 mt-4 first:mt-0 text-xs font-semibold uppercase tracking-wide text-muted">{fmt(new Date(a.createdAt), "EEEE, d MMMM yyyy")}</p>}
                  <span className={cn("absolute -left-[5px] mt-1.5 size-2.5 rounded-full ring-4 ring-surface", a.action === "completed" ? "bg-success" : a.action === "deleted" ? "bg-danger" : a.action === "created" ? "bg-accent" : "bg-border-strong")} />
                  <p className="text-sm">{a.entityType === "ai" && <Sparkles className="mr-1 inline size-3 text-accent" />}{trActivity(a.summary)}</p>
                  <p className="text-xs text-muted">{fmt(new Date(a.createdAt), "HH:mm")} · {a.entityType}</p>
                </li>
              );
            })}
          </ol>
          {hasMore && <Button variant="ghost" size="sm" loading={isValidating} onClick={() => setSize(size + 1)}>{tr("Load older")}</Button>}
        </Card>
      )}
    </>
  );
}
