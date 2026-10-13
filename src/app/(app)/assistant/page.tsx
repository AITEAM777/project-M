"use client";
import Link from "next/link";
import { useState } from "react";
import { Link2, NotebookText, Sparkles, Wand2 } from "lucide-react";
import { post, useApi } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { toast } from "@/lib/client/store";
import type { AiSuggestion } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Card, EmptyState, PageSkeleton } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { SuggestionView } from "@/components/ai/suggestion-view";
import { ago } from "@/lib/client/format";

const EXAMPLES = [
  "I want to start exercising three times a week, learn English, and spend more time developing my business.",
  "Build an emergency fund of 3 months of expenses while learning programming in the evenings.",
  "Sleep better, read 20 books this year and get promoted at work.",
];

export default function AssistantPage() {
  const { data: me } = useMe();
  const { data: history, mutate } = useApi<{ suggestions: AiSuggestion[] }>("/api/ai/suggestions");
  const [input, setInput] = useState("");
  const [availability, setAvailability] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [current, setCurrent] = useState<AiSuggestion | null>(null);
  if (!me) return <PageSkeleton />;
  if (!me.aiAvailable || !me.user.aiEnabled) {
    return <EmptyState icon={<Sparkles className="size-6" />} title="AI assistant is off" body={!me.aiAvailable ? "The server has no ANTHROPIC_API_KEY configured. Everything else in Nodera works without AI." : "Enable AI features in Settings to use the assistant."} action={<Link href="/settings"><Button>Open settings</Button></Link>} />;
  }
  const run = async (action: string, body: object) => {
    setBusy(action);
    try { const { suggestion } = await post<{ suggestion: AiSuggestion }>(`/api/ai/${action}`, body); setCurrent(suggestion); mutate(); } catch (e) { toast.error(e); } finally { setBusy(null); }
  };
  return (
    <div className="max-w-4xl">
      <PageHeader title="AI Assistant" icon={<Sparkles className="size-6 text-accent" />} description="Turns what you write into structured, connected plans. Suggestions are never applied without your approval." />
      <Card className="mb-5 p-5">
        <Field label="What do you want to achieve?">
          <Textarea rows={4} value={input} onChange={(e) => setInput(e.target.value)} placeholder={EXAMPLES[0]} />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => <button key={e} onClick={() => setInput(e)} className="rounded-full border border-border px-2.5 py-1 text-left text-xs text-muted hover:bg-surface-2">{e.slice(0, 60)}…</button>)}
        </div>
        <Field label="Your availability (optional)" className="mt-3"><Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. weekdays after 18:00, weekend mornings; work 9–17" /></Field>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" loading={busy === "plan"} disabled={!input.trim()} onClick={() => run("plan", { input, availability })}><Wand2 className="size-4" /> Propose a plan</Button>
        </div>
      </Card>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="flex items-center gap-2 font-medium"><Link2 className="size-4 text-accent" /> Discover connections</p>
          <p className="mt-1 text-sm text-muted">Finds useful links between your goals, projects, habits and notes.</p>
          <Button size="sm" className="mt-3" loading={busy === "connections"} onClick={() => run("connections", {})}>Analyze workspace</Button>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-2 font-medium"><NotebookText className="size-4 text-accent" /> Weekly reflection</p>
          <p className="mt-1 text-sm text-muted">Summarizes what you actually did this week — completed, unfinished, and what to improve.</p>
          <Button size="sm" className="mt-3" loading={busy === "reflect"} onClick={() => run("reflect", {})}>Reflect on my week</Button>
        </Card>
      </div>
      {current && <div className="mb-8"><SuggestionView key={current.id} s={current} onResolved={() => mutate()} /></div>}
      {!!history?.suggestions.length && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">History</h2>
          <Card className="divide-y divide-border">
            {history.suggestions.filter((s) => s.id !== current?.id).map((s) => (
              <button key={s.id} onClick={() => setCurrent(s)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-2">
                <span className="w-24 shrink-0 capitalize text-muted">{s.kind}</span>
                <span className="min-w-0 flex-1 truncate">{s.input || "—"}</span>
                <span className="text-xs text-muted">{s.status.toLowerCase()} · {ago(s.createdAt)}</span>
              </button>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
