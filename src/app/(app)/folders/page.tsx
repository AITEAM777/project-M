"use client";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { useState } from "react";
import { ArchiveRestore, FolderPlus } from "lucide-react";
import { invalidate, patch, useApi } from "@/lib/client/api";
import { toast, useUI } from "@/lib/client/store";
import type { Folder } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageSkeleton, Tabs } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";

export default function FoldersPage() {
  const { openCreate } = useUI();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const { data, mutate } = useApi<{ folders: Folder[] }>(`/api/folders${tab === "archived" ? "?archived=1" : ""}`);
  const top = data?.folders.filter((f) => tab === "archived" || !f.parentId) ?? [];
  const kids = (id: string) => data?.folders.filter((f) => f.parentId === id) ?? [];
  return (
    <>
      <PageHeader title={tr("All Folders")} description={tr("Organize every area of your life. Items can live in one folder and appear on many maps.")}
        actions={<><Tabs value={tab} onChange={setTab} items={[{ value: "active", label: tr("Folders") }, { value: "archived", label: tr("Archived") }]} /><Button variant="primary" onClick={() => openCreate("folder")}><FolderPlus className="size-4" />{" "}{tr("New folder")}</Button></>} />
      {!data ? <PageSkeleton /> : !top.length ? (
        <EmptyState icon={<FolderPlus className="size-6" />} title={tab === "active" ? tr("No folders") : tr("Nothing archived")} body={tr("Create folders like Health, Finance, Education or Business.")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {top.map((f) => (
            <Card key={f.id} className="relative p-4 transition-shadow hover:shadow-card">
              <Link href={`/folders/${f.id}`} className="block">
                <div className="mb-3 grid size-11 place-items-center rounded-xl text-xl" style={{ background: `${f.color}1f` }}>{f.icon}</div>
                <p className="font-semibold">{f.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {[f._count?.notes && `${f._count.notes} notes`, f._count?.maps && `${f._count.maps} maps`, f._count?.projects && `${f._count.projects} projects`, f._count?.goals && `${f._count.goals} goals`].filter(Boolean).join(" · ") || tr("Empty")}
                </p>
                {kids(f.id).length > 0 && <p className="mt-2 truncate text-xs text-muted">↳ {kids(f.id).map((k) => `${k.icon} ${k.name}`).join(", ")}</p>}
              </Link>
              {tab === "archived" && (
                <Button size="sm" className="mt-3" onClick={async () => { try { await patch(`/api/folders/${f.id}`, { archived: false }); mutate(); invalidate("/api/folders"); toast.success(tr("Folder restored")); } catch (e) { toast.error(e); } }}>
                  <ArchiveRestore className="size-4" />{" "}{tr("Restore")}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
