"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Monitor, Moon, Sun, Upload } from "lucide-react";
import { api, patch, post, withParams } from "@/lib/client/api";
import { applyTheme, useMe } from "@/lib/client/hooks";
import { toast, useWorkspace } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge, Card, PageSkeleton } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
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
  const limit = (v: number | null, unit = "") => (v == null ? "Unlimited" : `${unit === "MB" ? Math.round(v / 1048576) : v}${unit ? ` ${unit}` : ""}`);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Profile</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Name" className="flex-1"><Input defaultValue={u.name} onChange={(e) => setName(e.target.value)} /></Field>
            <Button onClick={() => name.trim() && save({ name: name.trim() }, "Name updated")} disabled={!name.trim() || name === u.name}>Save</Button>
          </div>
          <p className="mt-2 text-sm text-muted">Signed in as {u.email}</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Appearance</h2>
          <div className="grid grid-cols-3 gap-2">
            {[{ v: "light", l: "Light", i: Sun }, { v: "dark", l: "Dark", i: Moon }, { v: "system", l: "System", i: Monitor }].map(({ v, l, i: I }) => (
              <button key={v} onClick={() => theme(v)} className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 text-sm", u.theme === v ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-2")}>
                <I className="size-5" />{l}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[var(--accent)]" defaultChecked={typeof window !== "undefined" && localStorage.getItem("nodera-reduce-motion") === "1"}
              onChange={(e) => { try { localStorage.setItem("nodera-reduce-motion", e.target.checked ? "1" : "0"); } catch {} document.documentElement.classList.toggle("reduce-motion", e.target.checked); }} />
            Reduce motion (also follows your system setting)
          </label>
        </Card>

        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2"><h2 className="font-semibold">AI assistant</h2>{!me.aiAvailable && <Badge>Not configured on this server</Badge>}</div>
          <p className="mb-3 text-sm text-muted">The assistant only reads the workspace data needed for the action you trigger, never changes anything without your confirmation, and clearly marks its suggestions.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[var(--accent)]" checked={u.aiEnabled} disabled={!me.aiAvailable} onChange={(e) => save({ aiEnabled: e.target.checked }, e.target.checked ? "AI features enabled" : "AI features disabled")} />
            Enable AI features
          </label>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2"><h2 className="font-semibold">Plan & limits</h2><Badge className="border-accent/30 bg-accent-soft text-accent">{u.plan}</Badge></div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Active mind maps</dt><dd className="font-medium">{limit(me.limits.activeMindMaps)}</dd></div>
            <div><dt className="text-muted">Nodes per map</dt><dd className="font-medium">{limit(me.limits.nodesPerMap)}</dd></div>
            <div><dt className="text-muted">Workspaces</dt><dd className="font-medium">{limit(me.limits.workspaces)}</dd></div>
            <div><dt className="text-muted">Storage</dt><dd className="font-medium">{limit(me.limits.storageBytes, "MB")}</dd></div>
            <div><dt className="text-muted">AI requests / day</dt><dd className="font-medium">{limit(me.limits.aiRequestsPerDay)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">Pro and Teams plans are coming soon. Billing is not enabled yet.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Your data</h2>
          <p className="mb-4 text-sm text-muted">Export the current workspace any time. JSON exports are complete and can be imported back as a new workspace (backup & restore).</p>
          <div className="flex flex-wrap gap-2">
            <a href={withParams("/api/export?format=json", ws)} download><Button><Download className="size-4" /> Export JSON</Button></a>
            <a href={withParams("/api/export?format=markdown", ws)} download><Button><Download className="size-4" /> Export Markdown</Button></a>
            <Button loading={busy === "import"} onClick={() => file.current?.click()}><Upload className="size-4" /> Import JSON backup</Button>
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
                toast.success(`Imported into “${j.workspace.name}”`);
                window.location.href = "/dashboard";
              } catch (err) { toast.error(err); } finally { setBusy(null); }
            }} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Password</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password"><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Button loading={busy === "pw"} disabled={!pw.current || pw.next.length < 8} onClick={async () => {
              setBusy("pw");
              try { await post("/api/me/password", pw); setPw({ current: "", next: "" }); toast.success("Password changed"); } catch (e) { toast.error(e); } finally { setBusy(null); }
            }}>Change</Button>
          </div>
        </Card>

        <Card className="border-danger/30 p-5">
          <h2 className="mb-1 font-semibold text-danger">Delete account</h2>
          <p className="mb-3 text-sm text-muted">Permanently deletes your account, every workspace you own and all files. Export your data first — this cannot be undone.</p>
          <Button variant="outline" className="text-danger" onClick={() => setDel({ ...del, open: true })}>Delete my account…</Button>
        </Card>
      </div>

      <Dialog open={del.open} onClose={() => setDel({ open: false, password: "", confirm: "" })} title="Delete your account?" description="This permanently removes all of your data."
        footer={<>
          <Button variant="ghost" onClick={() => setDel({ open: false, password: "", confirm: "" })}>Cancel</Button>
          <Button variant="danger" loading={busy === "del"} disabled={del.confirm !== "DELETE" || !del.password} onClick={async () => {
            setBusy("del");
            try { await api("/api/account", { method: "DELETE", json: { password: del.password, confirm: del.confirm } }); router.replace("/login"); } catch (e) { toast.error(e); setBusy(null); }
          }}>Delete everything</Button>
        </>}>
        <div className="space-y-3">
          <Field label="Password"><Input type="password" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} /></Field>
          <Field label='Type "DELETE" to confirm'><Input value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} /></Field>
        </div>
      </Dialog>
    </div>
  );
}
