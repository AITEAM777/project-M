"use client";
import { tp, tr, translated } from "@/lib/i18n";
import Link from "next/link";
import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { invalidate, patch } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import type { AiSuggestion } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const REL: Record<string, string> = translated({ RELATED_TO: "related to", DEPENDS_ON: "depends on", SUPPORTS: "supports", BLOCKS: "blocks", PART_OF: "part of", REQUIRES: "requires", CONFLICTS_WITH: "conflicts with", COMBINES_WITH: "can combine with", LEADS_TO: "leads to" });
const DAYS = translated(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

/**
 * Renders an AI suggestion, clearly marked as AI-generated. Nothing is saved until
 * the user explicitly accepts (optionally choosing which items to keep).
 */
export function SuggestionView({ s, onResolved }: { s: AiSuggestion; onResolved?: (result: any) => void }) {
  const p = s.payload as any;
  const items: any[] = s.kind === "plan" ? p.goals : s.kind === "connections" ? p.suggestions : s.kind === "breakdown" ? p.milestones : [];
  const [selected, setSelected] = useState<number[]>(items.map((_, i) => i));
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState(s.status);
  const [result, setResult] = useState<any>(null);
  const toggle = (i: number) => setSelected((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]));
  const actionable = ["plan", "connections", "breakdown", "organize"].includes(s.kind);

  const resolve = async (action: "accept" | "dismiss") => {
    setBusy(action);
    try {
      const r = await patch<{ result: any }>(`/api/ai/suggestions/${s.id}`, { action, selected: items.length ? selected : undefined, includeSchedule, tzo: new Date().getTimezoneOffset() });
      setStatus(action === "accept" ? "ACCEPTED" : "DISMISSED");
      setResult(r.result);
      if (action === "accept") {
        invalidate("/api/");
        toast.success(tr("Applied to your workspace"));
      }
      onResolved?.(r.result);
    } catch (e) { toast.error(e); } finally { setBusy(null); }
  };

  const Check_ = ({ i }: { i: number }) =>
    status === "PENDING" && items.length > 1 ? (
      <input type="checkbox" checked={selected.includes(i)} onChange={() => toggle(i)} className="mt-1 accent-[var(--accent)]" aria-label={tr("Include")} />
    ) : null;

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Badge className="border-accent/30 bg-accent-soft text-accent"><Sparkles className="size-3" />{" "}{tr("AI suggestion")}</Badge>
        <span className="text-xs text-muted">{tr("Review before applying — nothing changes until you accept.")}</span>
      </div>

      {s.kind === "plan" && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{p.summary}</p>
          {p.goals.map((g: any, i: number) => (
            <label key={g.key} className={cn("flex gap-3 rounded-xl border border-border bg-surface p-3", !selected.includes(i) && "opacity-50")}>
              <Check_ i={i} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">🎯 {g.title} <span className="font-normal text-muted">· {g.category}</span></p>
                <p className="mt-0.5 text-muted">{g.description}</p>
                {g.milestones.length > 0 && <p className="mt-1.5"><span className="font-medium">{tr("Milestones:")}</span> {g.milestones.join(" → ")}</p>}
                {g.firstTasks.length > 0 && <p className="mt-1"><span className="font-medium">{tr("First steps:")}</span> {g.firstTasks.join("; ")}</p>}
                {g.habits.length > 0 && <p className="mt-1"><span className="font-medium">{tr("Habits:")}</span> {g.habits.map((h: any) => `${h.title} (${h.targetPerPeriod} ${h.unit}/${h.frequency === "DAILY" ? "day" : "week"})`).join("; ")}</p>}
              </div>
            </label>
          ))}
          {p.connections.length > 0 && (
            <div className="text-sm">
              <p className="font-medium">{tr("Connections")}</p>
              <ul className="mt-1 space-y-0.5 text-muted">
                {p.connections.map((c: any, i: number) => {
                  const t = (k: string) => p.goals.find((g: any) => g.key === k)?.title ?? k;
                  return <li key={i}>{t(c.fromKey)} <span className="font-medium text-accent">{REL[c.relation]}</span> {t(c.toKey)} — {c.reason}</li>;
                })}
              </ul>
            </div>
          )}
          {p.schedule.length > 0 && (
            <div className="text-sm">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={includeSchedule} disabled={status !== "PENDING"} onChange={(e) => setIncludeSchedule(e.target.checked)} className="accent-[var(--accent)]" />{" "}{tr("Weekly schedule (adds recurring calendar blocks)")}</label>
              <ul className="mt-1 grid gap-0.5 text-muted sm:grid-cols-2">
                {p.schedule.map((b: any, i: number) => <li key={i}>{DAYS[b.dayOfWeek]} {b.start} · {tr("{m} min", { m: b.durationMinutes })} — {b.title}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {s.kind === "connections" && (
        <ul className="space-y-2">
          {p.suggestions.length === 0 && <li className="text-sm text-muted">{tr("No new connections found — your items look well connected.")}</li>}
          {p.suggestions.map((c: any, i: number) => (
            <li key={i}>
              <label className={cn("flex gap-3 rounded-xl border border-border bg-surface p-3 text-sm", !selected.includes(i) && "opacity-50")}>
                <Check_ i={i} />
                <span>
                  <span className="font-medium">{c.sourceRef.split(":")[0]}</span> <span className="text-accent font-medium">{REL[c.relation]}</span> <span className="font-medium">{c.targetRef.split(":")[0]}</span>
                  <span className="block text-muted">{c.reason}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {s.kind === "breakdown" && (
        <ul className="space-y-2">
          {p.milestones.map((m: any, i: number) => (
            <li key={i}>
              <label className={cn("flex gap-3 rounded-xl border border-border bg-surface p-3 text-sm", !selected.includes(i) && "opacity-50")}>
                <Check_ i={i} />
                <span className="flex-1">
                  <span className="font-semibold">🏁 {m.title}</span>
                  <ul className="mt-1 space-y-0.5 text-muted">{m.tasks.map((t: any, j: number) => <li key={j}>• {t.title} <span className="text-xs">({tr("{m} min", { m: t.estimateMinutes })})</span></li>)}</ul>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {s.kind === "organize" && (
        <div className="space-y-1.5 text-sm">
          <p><span className="font-medium">{tr("Title:")}</span> {p.title}</p>
          <p><span className="font-medium">{tr("Tags:")}</span> {p.tags.map((t: string) => `#${t}`).join(" ")}</p>
          {p.folderId && <p><span className="font-medium">{tr("Folder:")}</span>{" "}{tr("suggested folder will be applied")}</p>}
          {p.relatedRefs.length > 0 && <p><span className="font-medium">{tr("Related:")}</span> {tp(p.relatedRefs.length, "# existing item", "# existing items")}</p>}
          {p.nextActions.length > 0 && <div><p className="font-medium">{tr("Actions found (will become tasks):")}</p><ul className="text-muted">{p.nextActions.map((a: string, i: number) => <li key={i}>• {a}</li>)}</ul></div>}
        </div>
      )}

      {(s.kind === "summarize" || s.kind === "reflect") && (
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed">{p.summary}</p>
          {[["Key themes", p.keyThemes], ["Wins", p.wins], ["Unfinished", p.unfinished], ["Patterns", p.patterns], ["Open questions", p.openQuestions], ["Suggested next steps", p.suggestedNextSteps], ["Ideas to improve", p.improvements]]
            .filter(([, v]) => Array.isArray(v) && v.length)
            .map(([label, v]) => (
              <div key={label as string}>
                <p className="font-medium">{tr(label as string)}</p>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-text-2">{(v as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status === "PENDING" && actionable ? (
          <>
            <Button variant="primary" size="sm" loading={busy === "accept"} disabled={items.length > 0 && !selected.length} onClick={() => resolve("accept")}><Check className="size-4" />{" "}{tr("Accept")}{items.length > 1 ? ` (${selected.length})` : ""}</Button>
            <Button variant="ghost" size="sm" loading={busy === "dismiss"} onClick={() => resolve("dismiss")}><X className="size-4" />{" "}{tr("Dismiss")}</Button>
          </>
        ) : status === "PENDING" ? (
          <Button variant="ghost" size="sm" loading={busy === "dismiss"} onClick={() => resolve("dismiss")}>{tr("Done")}</Button>
        ) : (
          <span className="text-xs font-medium text-muted">{status === "ACCEPTED" ? tr("✓ Applied") : tr("Dismissed")}</span>
        )}
        {result?.mapId && <Link href={`/maps/${result.mapId}`} className="text-sm font-medium text-accent hover:underline">{tr("Open the map →")}</Link>}
        {result?.goalId && <Link href={`/goals/${result.goalId}`} className="text-sm font-medium text-accent hover:underline">{tr("Open the goal →")}</Link>}
      </div>
    </div>
  );
}
