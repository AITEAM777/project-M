"use client";
import { tr } from "@/lib/i18n";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { post } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import type { AiSuggestion } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/misc";
import { SuggestionView } from "@/components/ai/suggestion-view";

export function AiSummaryButton({ mapId, flush }: { mapId: string; flush: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState<AiSuggestion | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      await flush();
      const { suggestion } = await post<{ suggestion: AiSuggestion }>("/api/ai/summarize", { mapId });
      setS(suggestion);
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  return (
    <>
      <Tooltip label={tr("Summarize this map with AI")} side="bottom">
        <Button variant="ghost" size="icon-sm" loading={busy} onClick={run} aria-label={tr("AI summary")}>{!busy && <Sparkles className="size-4 text-accent" />}</Button>
      </Tooltip>
      <Dialog open={!!s} onClose={() => setS(null)} title={tr("Map summary")} size="lg">
        {s && <SuggestionView s={s} onResolved={() => setS(null)} />}
      </Dialog>
    </>
  );
}
