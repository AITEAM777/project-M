"use client";
import { TYPE_LABEL } from "@/lib/entity-labels";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useDebouncedValue } from "@/lib/client/hooks";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge, Card, EmptyState, PageSkeleton } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";

type Result = { type: string; id: string; title: string; snippet?: string; href: string; meta?: string; updatedAt?: string };

export default function SearchPage() {
  return <Suspense fallback={<PageSkeleton />}><SearchInner /></Suspense>;
}

function SearchInner() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [tag, setTag] = useState("");
  const [types, setTypes] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const dq = useDebouncedValue(q, 250);
  const dtag = useDebouncedValue(tag, 250);
  const p = new URLSearchParams({ limit: "40" });
  if (dq) p.set("q", dq);
  if (dtag) p.set("tag", dtag.replace(/^#/, ""));
  if (types) p.set("types", types);
  if (status) p.set("status", status);
  if (from) p.set("from", new Date(from).toISOString());
  if (to) p.set("to", new Date(`${to}T23:59:59`).toISOString());
  const active = dq || dtag || status || from;
  const { data, isLoading } = useApi<{ results: Result[] }>(active ? `/api/search?${p}` : null);
  return (
    <>
      <PageHeader title={tr("Search")} description={tr("Find anything by keyword, tag, type, status or date.")} />
      <Card className="mb-5 grid gap-3 p-4 md:grid-cols-6">
        <Field label={tr("Keywords")} className="md:col-span-2">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder={tr("e.g. startup")} /></div>
        </Field>
        <Field label={tr("Tag")}><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder={tr("#finance")} /></Field>
        <Field label={tr("Type")}>
          <Select value={types} onChange={(e) => setTypes(e.target.value)}>
            <option value="">{tr("All types")}</option><option value="note">{tr("Notes")}</option><option value="thought">{tr("Thoughts")}</option><option value="node">{tr("Map nodes")}</option><option value="task">{tr("Tasks")}</option>
            <option value="goal">{tr("Goals")}</option><option value="project">{tr("Projects")}</option><option value="map">{tr("Maps")}</option><option value="habit">{tr("Habits")}</option><option value="folder">{tr("Folders")}</option>
          </Select>
        </Field>
        <Field label={tr("Status")}>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{tr("Any")}</option><option value="TODO">{tr("Task: to do")}</option><option value="IN_PROGRESS">{tr("Task: in progress")}</option><option value="DONE">{tr("Task: done")}</option>
            <option value="ACTIVE">{tr("Goal/project: active")}</option><option value="COMPLETED">{tr("Goal/project: completed")}</option><option value="ON_HOLD">{tr("On hold")}</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr("From")}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label={tr("To")}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>
      {!active ? <EmptyState icon={<Search className="size-6" />} title={tr("Search your second brain")} body={tr("Tip: press ⌘K anywhere for instant search.")} /> : isLoading && !data ? <PageSkeleton /> : !data?.results.length ? (
        <p className="py-10 text-center text-sm text-muted">{tr("No results.")}</p>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.results.map((r) => (
            <Link key={`${r.type}:${r.id}`} href={r.href} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2">
              <Badge className="mt-0.5">{tr(TYPE_LABEL[r.type] ?? r.type)}</Badge>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.title}</span>
                {r.snippet && <span className="block truncate text-sm text-muted">{r.snippet}</span>}
              </span>
              {r.meta && <span className="text-xs capitalize text-muted">{r.meta}</span>}
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
