"use client";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { useState } from "react";
import { FolderTree, Plus, Star, Target } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useUI } from "@/lib/client/store";
import { relDay } from "@/lib/client/format";
import type { Project } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageSkeleton, Progress, Tabs } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { PROJECT_STATUS_LABEL } from "@/components/forms/other-forms";

export default function ProjectsPage() {
  const { openCreate } = useUI();
  const [tab, setTab] = useState<"active" | "completed" | "archived">("active");
  const { data } = useApi<{ projects: Project[] }>(`/api/projects${tab === "archived" ? "?archived=1" : ""}`);
  const list = data?.projects.filter((p) => tab === "archived" || (tab === "completed" ? p.status === "COMPLETED" : p.status !== "COMPLETED"));
  return (
    <>
      <PageHeader title={tr("Projects")} description={tr("Structured collections of tasks that move your goals forward.")}
        actions={<><Tabs value={tab} onChange={setTab} items={[{ value: "active", label: tr("Active") }, { value: "completed", label: tr("Completed") }, { value: "archived", label: tr("Archived") }]} /><Button data-tour="projects-new" variant="primary" onClick={() => openCreate("project")}><Plus className="size-4" />{" "}{tr("New project")}</Button></>} />
      {!list ? <PageSkeleton /> : !list.length ? (
        <EmptyState icon={<FolderTree className="size-6" />} title={tr("No projects here")} body={tr("Group related tasks into a project and link it to a goal to track progress automatically.")}
          action={tab === "active" && <Button variant="primary" onClick={() => openCreate("project")}><Plus className="size-4" />{" "}{tr("Create a project")}</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full p-4 transition-shadow hover:shadow-card">
                <div className="flex items-start gap-3">
                  <span className="mt-1 size-3 shrink-0 rounded" style={{ background: p.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">{p.favorite && <Star className="size-3.5 fill-amber-400 text-amber-400" />}{p.title}</p>
                    {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  </div>
                  <Badge>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={p.progress.percent} color={p.color} />
                  <span className="text-xs tabular text-muted whitespace-nowrap">{p.progress.done}/{p.progress.total}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  {p.goal && <span className="inline-flex items-center gap-1"><Target className="size-3" />{p.goal.title}</span>}
                  {p.dueDate && <span>{tr("Due")}{" "}{relDay(p.dueDate)}</span>}
                  {!!p.overdue && <span className="font-medium text-danger">{p.overdue} overdue</span>}
                  {p.folder && <span>{p.folder.icon} {p.folder.name}</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
