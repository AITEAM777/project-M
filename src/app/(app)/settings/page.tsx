"use client";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Monitor, Moon, Sun, Upload } from "lucide-react";
import { api, patch, post, withParams } from "@/lib/client/api";
import { applyTheme, useMe } from "@/lib/client/hooks";
import { toast, useWorkspace } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge, Card, PageSkeleton } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { BillingPanel } from "@/components/billing/billing-panel";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "billing", label: "Plan & billing" },
  { id: "security", label: "Security" },
  { id: "data", label: "Data" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  return <Suspense><Settings /></Suspense>;
}

function Settings() {
  const params = useSearchParams();
  const tab: Tab = TABS.some((t) => t.id === params.get("tab")) ? (params.get("tab") as Tab) : "profile";
  const { data: me, mutate } = useMe();
  const ws = useWorkspace((s) => s.id);
  const router = useRouter();
  const [name, setName] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [del, setDel] = useState({ open: false, password: "", confirm: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  if (!me) return <PageSkeleton />;
  const u = me.user;
  const save = async (body: object, msg = "Saved") => { try { await patch("/api/me", body); mutate(); toast.success(msg); } catch (e) { toast.error(e); } };
  const theme = (t: string) => { applyTheme(t); save({ theme: t }, "Theme updated"); };

  return (
    <div className={tab === "billing" ? "max-w-6xl" : "max-w-3xl"}>
      <PageHeader title={tr("Settings")} />
      <nav aria-label={tr("Settings sections")} className="-mt-2 mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "profile" ? "/settings" : `/settings?tab=${t.id}`} aria-current={tab === t.id ? "page" : undefined} data-tour={t.id === "data" ? "settings-data" : undefined}
            className={cn("-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors", tab === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-text")}>
            {tr(t.label)}
          </Link>
        ))}
      </nav>
      {tab === "billing" ? <BillingPanel /> : (
      <div className="space-y-5">
        {tab === "profile" && <>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">{tr("Profile")}</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label={tr("Name")} className="flex-1"><Input defaultValue={u.name} onChange={(e) => setName(e.target.value)} /></Field>
            <Button onClick={() => name.trim() && save({ name: name.trim() }, "Name updated")} disabled={!name.trim() || name === u.name}>{tr("Save")}</Button>
          </div>
          <p className="mt-2 text-sm text-muted">{tr("Signed in as")}{" "}{u.email}</p>
        </Card>
        <Card data-tour="settings-language" className="p-5">
          <h2 className="mb-1 font-semibold">{tr("Language")}</h2>
          <p className="mb-3 text-sm text-muted">{tr("Choose the language of the interface.")}</p>
          <LanguageSwitcher />
        </Card>
        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2"><h2 className="font-semibold">{tr("AI assistant")}</h2>{!me.aiAvailable && <Badge>{tr("Temporarily unavailable")}</Badge>}</div>
          <p className="mb-3 text-sm text-muted">{tr("The assistant only reads the workspace data needed for the action you trigger, never changes anything without your confirmation, and clearly marks its suggestions.")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[var(--accent)]" checked={u.aiEnabled} disabled={!me.aiAvailable} onChange={(e) => save({ aiEnabled: e.target.checked }, e.target.checked ? "AI features enabled" : "AI features disabled")} />
            {tr("Enable AI features")}
          </label>
        </Card>
        </>}
        {tab === "appearance" && <>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">{tr("Appearance")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {[{ v: "light", l: "Light", i: Sun }, { v: "dark", l: "Dark", i: Moon }, { v: "system", l: "System", i: Monitor }].map(({ v, l: label, i: I }) => ({ v, l: tr(label), I })).map(({ v, l, I }) => (
              <button key={v} onClick={() => theme(v)} className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 text-sm", u.theme === v ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-2")}>
                <I className="size-5" />{l}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[var(--accent)]" defaultChecked={typeof window !== "undefined" && localStorage.getItem("nodera-reduce-motion") === "1"}
              onChange={(e) => { try { localStorage.setItem("nodera-reduce-motion", e.target.checked ? "1" : "0"); } catch {} document.documentElement.classList.toggle("reduce-motion", e.target.checked); }} />
            {tr("Reduce motion (also follows your system setting)")}
          </label>
        </Card>
        </>}
        {tab === "security" && <>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">{tr("Password")}</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label={tr("Current password")}><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label={tr("New password")}><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Button loading={busy === "pw"} disabled={!pw.current || pw.next.length < 8} onClick={async () => {
              setBusy("pw");
              try { await post("/api/me/password", pw); setPw({ current: "", next: "" }); toast.success(tr("Password changed")); } catch (e) { toast.error(e); } finally { setBusy(null); }
            }}>{tr("Change")}</Button>
          </div>
        </Card>
        <Card className="border-danger/30 p-5">
          <h2 className="mb-1 font-semibold text-danger">{tr("Delete account")}</h2>
          <p className="mb-3 text-sm text-muted">{tr("Permanently deletes your account, every workspace you own and all files. Export your data first — this cannot be undone.")}</p>
          <Button variant="outline" className="text-danger" onClick={() => setDel({ ...del, open: true })}>{tr("Delete my account…")}</Button>
        </Card>
        </>}
        {tab === "data" && <>
        <Card className="p-5">
          <h2 className="mb-1 font-semibold">{tr("Your data")}</h2>
          <p className="mb-4 text-sm text-muted">{tr("Export the current workspace any time. JSON exports are complete and can be imported back as a new workspace (backup & restore).")}</p>
          <div className="flex flex-wrap gap-2">
            <a href={withParams("/api/export?format=json", ws)} download><Button><Download className="size-4" />{" "}{tr("Export JSON")}</Button></a>
            <a href={withParams("/api/export?format=markdown", ws)} download><Button><Download className="size-4" />{" "}{tr("Export Markdown")}</Button></a>
            <Button loading={busy === "import"} onClick={() => file.current?.click()}><Upload className="size-4" />{" "}{tr("Import JSON backup")}</Button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy("import");
              try {
                const res = await fetch(withParams("/api/import", ws), { method: "POST", body: await f.text(), headers: { "Content-Type": "application/json" } });
                const j = await res.json();
                if (!res.ok) throw new Error(j.error);
                useWorkspace.getState().set(j.workspace.id);
                toast.success(tr("Imported into “{name}”", { name: j.workspace.name }));
                window.location.href = "/dashboard";
              } catch (err) { toast.error(err); } finally { setBusy(null); }
            }} />
          </div>
        </Card>
        </>}
      </div>
      )}

      <Dialog open={del.open} onClose={() => setDel({ open: false, password: "", confirm: "" })} title={tr("Delete your account?")} description={tr("This permanently removes all of your data.")}
        footer={<>
          <Button variant="ghost" onClick={() => setDel({ open: false, password: "", confirm: "" })}>{tr("Cancel")}</Button>
          <Button variant="danger" loading={busy === "del"} disabled={del.confirm !== "DELETE" || !del.password} onClick={async () => {
            setBusy("del");
            try { await api("/api/account", { method: "DELETE", json: { password: del.password, confirm: del.confirm } }); router.replace("/login"); } catch (e) { toast.error(e); setBusy(null); }
          }}>{tr("Delete everything")}</Button>
        </>}>
        <div className="space-y-3">
          <Field label={tr("Password")}><Input type="password" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} /></Field>
          <Field label={tr("Type \"DELETE\" to confirm")}><Input value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} /></Field>
        </div>
      </Dialog>
    </div>
  );
}
