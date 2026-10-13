"use client";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Goal as GoalIcon, Plus } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useUI } from "@/lib/client/store";
import { relDay } from "@/lib/client/format";
import type { Goal } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageSkeleton, Progress, ProgressRing, Tabs } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { GOAL_STATUS_LABEL } from "@/components/forms/goal-form";
import { PRIORITY_COLOR } from "@/components/forms/options";

export default function GoalsPage() {
  const { openCreate } = useUI();
  const [tab, setTab] = useState<"active" | "all" | "done">("active");
  const { data } = useApi<{ goals: Goal[] }>("/api/goals");
  const goals = useMemo(() => (data?.goals ?? []).filter((g) => tab === "all" || (tab === "done" ? g.status === "COMPLETED" : ["ACTIVE", "NOT_STARTED", "ON_HOLD"].includes(g.status))), [data, tab]);
  return (
    <>
      <PageHeader title={tr("Goals")} description={tr("Long-term outcomes, measured by real milestones and completed work.")}
        actions={<><Tabs value={tab} onChange={setTab} items={[{ value: "active", label: tr("In progress") }, { value: "done", label: tr("Achieved") }, { value: "all", label: tr("All") }]} /><Button data-tour="goals-new" variant="primary" onClick={() => openCreate("goal")}><Plus className="size-4" />{" "}{tr("New goal")}</Button></>} />
      {!data ? <PageSkeleton /> : !goals.length ? (
        <EmptyState icon={<GoalIcon className="size-6" />} title={tab === "done" ? tr("No achieved goals yet") : tr("No goals yet")} body={tr("Example: “Improve physical fitness” with milestones like “Exercise 3× per week” and “Evaluate after 30 days”.")}
          action={tab !== "done" && <Button variant="primary" onClick={() => openCreate("goal")}><Plus className="size-4" />{" "}{tr("Set your first goal")}</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {goals.map((g) => (
                  <Link key={g.id} href={`/goals/${g.id}`}>
                    <Card className="h-full p-4 transition-shadow hover:shadow-card">
                      <div className="flex items-start gap-3">
                        <ProgressRing value={g.progress} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug">{g.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge>{GOAL_STATUS_LABEL[g.status]}</Badge>
                            <Badge color={PRIORITY_COLOR[g.priority]}>{g.priority.toLowerCase()}</Badge>
                            {g.category && <Badge>{g.category}</Badge>}
                            {g.targetDate && <span className="text-xs text-muted">by {relDay(g.targetDate)}</span>}
                          </div>
                        </div>
                      </div>
                      {g.milestones.length > 0 && (
                        <ul className="mt-3 space-y-1 text-sm">
                          {g.milestones.slice(0, 4).map((m) => <li key={m.id} className={m.done ? "text-muted line-through" : ""}>{m.done ? "✓" : "○"} {m.title}</li>)}
                          {g.milestones.length > 4 && <li className="text-xs text-muted">+{g.milestones.length - 4} more</li>}
                        </ul>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                        <Progress value={g.taskCount ? (g.doneTaskCount / g.taskCount) * 100 : 0} size="sm" />
                        <span className="whitespace-nowrap tabular">{g.doneTaskCount}/{g.taskCount} tasks</span>
                      </div>
                    </Card>
                  </Link>
                ))}
        </div>
      )}
    </>
  );
}
