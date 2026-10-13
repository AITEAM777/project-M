"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeftRight, ArrowRight, Copy, ExternalLink, FileText, Link2, MoveRight, Paperclip, Trash2, Unlink, Upload, X } from "lucide-react";
import { api, useApi, withParams } from "@/lib/client/api";
import { toast, useWorkspace } from "@/lib/client/store";
import { bytes } from "@/lib/client/format";
import type { Attachment, Goal, MapSummary, NoteSummary, Project } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge, ColorPicker, Progress, TagInput } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { useMap, useMapCtx } from "./context";
import { KIND_META, RELATION_META, type MindNode, type NodeKind, type Relation, type RelationEdge } from "./types";

export interface PanelActions {
  convert: (nodeId: string, to: "TASK" | "NOTE" | "GOAL" | "PROJECT" | "HABIT", extra?: { goalId?: string | null; projectId?: string | null }) => Promise<void>;
  duplicate: (ids: string[]) => void;
  remove: (ids: string[]) => void;
  moveToMap: (nodeId: string, targetMapId: string) => Promise<void>;
  select: (nodeId: string) => void;
  flush: () => Promise<void>;
  setTaskStatus: (nodeId: string, status: string) => Promise<void>;
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-t border-border px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NodePanel({ node, actions, onClose }: { node: MindNode; actions: PanelActions; onClose: () => void }) {
  const { store, readOnly } = useMapCtx();
  const edges = useMap((s) => s.edges);
  const nodes = useMap((s) => s.nodes);
  const d = node.data;
  const upd = (data: Partial<MindNode["data"]>) => store.getState().updateNode(node.id, data, { checkpoint: false });
  const cp = () => store.getState().checkpoint();
  const [link, setLink] = useState("");
  const titleOf = (id: string) => nodes.find((n) => n.id === id)?.data.title || "Untitled";
  const conns = edges.filter((e) => e.source === node.id || e.target === node.id);
  const isGroup = d.kind === "GROUP";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-lg">{d.icon || KIND_META[d.kind].icon}</span>
        <p className="flex-1 truncate text-sm font-semibold">{d.title || "Untitled"}</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel"><X className="size-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 px-4 pb-4">
          <Field label="Title"><Textarea rows={2} className="min-h-0" value={d.title} disabled={readOnly} onFocus={cp} onChange={(e) => upd({ title: e.target.value })} /></Field>
          {!isGroup && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Type">
                <Select value={d.kind} disabled={readOnly} onChange={(e) => { cp(); upd({ kind: e.target.value as NodeKind }); }}>
                  {Object.entries(KIND_META).filter(([k]) => k !== "GROUP").map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
                </Select>
              </Field>
              <Field label="Shape">
                <Select value={d.shape} disabled={readOnly} onChange={(e) => { cp(); upd({ shape: e.target.value as MindNode["data"]["shape"] }); }}>
                  <option value="rounded">Rounded</option><option value="pill">Pill</option><option value="rectangle">Rectangle</option><option value="circle">Circle</option><option value="diamond">Decision</option>
                </Select>
              </Field>
            </div>
          )}
          <div className="grid grid-cols-[72px_1fr] gap-2">
            <Field label="Icon"><Input value={d.icon} maxLength={4} placeholder={KIND_META[d.kind].icon} className="text-center" disabled={readOnly} onFocus={cp} onChange={(e) => upd({ icon: e.target.value })} /></Field>
            <Field label="Color"><div className="pt-1"><ColorPicker allowNone value={d.color} onChange={(c) => { cp(); upd({ color: c }); }} /></div></Field>
          </div>
          {!isGroup && <Field label="Description"><Textarea rows={4} value={d.description} disabled={readOnly} onFocus={cp} onChange={(e) => upd({ description: e.target.value })} placeholder="Details, reasoning, context…" /></Field>}
          {!isGroup && <Field label="Tags"><TagInput value={d.tags} onChange={(tags) => { cp(); upd({ tags }); }} /></Field>}
        </div>

        {!isGroup && <LinkedSection node={node} actions={actions} />}

        {!isGroup && (
          <Section title="Links">
            <div className="space-y-1.5">
              {d.links.map((u) => (
                <div key={u} className="flex items-center gap-2 text-sm">
                  <Link2 className="size-3.5 text-muted shrink-0" />
                  <a href={u} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-accent hover:underline">{u.replace(/^https?:\/\//, "")}</a>
                  {!readOnly && <button onClick={() => { cp(); upd({ links: d.links.filter((x) => x !== u) }); }} className="text-muted hover:text-danger" aria-label="Remove link"><X className="size-3.5" /></button>}
                </div>
              ))}
              {!readOnly && (
                <form className="flex gap-1.5" onSubmit={(e) => {
                  e.preventDefault();
                  try { const u = new URL(link.includes("://") ? link : `https://${link}`); cp(); upd({ links: [...d.links, u.toString()] }); setLink(""); } catch { toast.error(new Error("Enter a valid URL")); }
                }}>
                  <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="h-8" />
                  <Button type="submit" size="sm" disabled={!link}>Add</Button>
                </form>
              )}
            </div>
          </Section>
        )}

        {!isGroup && <AttachmentsSection nodeId={node.id} actions={actions} />}

        <Section title={`Connections (${conns.length})`}>
          {!conns.length && <p className="text-xs text-muted">Drag from a node’s edge handle to another node to connect them.</p>}
          <ul className="space-y-1">
            {conns.map((e) => {
              const out = e.source === node.id;
              const other = out ? e.target : e.source;
              const rel = RELATION_META[e.data?.relation ?? "RELATED_TO"];
              return (
                <li key={e.id}>
                  <button onClick={() => actions.select(other)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
                    {e.data?.bidirectional ? <ArrowLeftRight className="size-3.5 shrink-0 text-muted" /> : <ArrowRight className={cn("size-3.5 shrink-0 text-muted", !out && "rotate-180")} />}
                    <span className="text-xs font-medium" style={{ color: rel.color }}>{out ? rel.label : `← ${rel.label}`}</span>
                    <span className="flex-1 truncate">{titleOf(other)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        {!readOnly && (
          <Section title="Actions">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => actions.duplicate([node.id])}><Copy className="size-3.5" /> Duplicate</Button>
              <MoveToMap nodeId={node.id} actions={actions} />
              <Button size="sm" variant="outline" className="col-span-2 text-danger" onClick={() => actions.remove([node.id])}><Trash2 className="size-3.5" /> Delete node</Button>
            </div>
            <p className="mt-2 text-[11px] text-muted">Deleting a node never deletes the linked task, goal or note.</p>
          </Section>
        )}
      </div>
    </div>
  );
}

function LinkedSection({ node, actions }: { node: MindNode; actions: PanelActions }) {
  const { store, readOnly } = useMapCtx();
  const d = node.data;
  const l = d.linked;
  const [busy, setBusy] = useState<string | null>(null);
  const [goalFor, setGoalFor] = useState<string>("");
  const { data: goals } = useApi<{ goals: Goal[] }>("/api/goals");
  const { data: projects } = useApi<{ projects: Project[] }>("/api/projects");
  const { data: notes } = useApi<{ notes: NoteSummary[] }>("/api/notes?limit=200");
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } finally { setBusy(null); } };
  const unlink = (field: "taskId" | "goalId" | "projectId" | "habitId" | "noteId") => {
    store.getState().updateNode(node.id, { [field]: null, linked: { ...(l ?? { task: null, note: null, goal: null, project: null, habit: null }), [field.replace("Id", "")]: null } });
  };
  const linkExisting = (field: "goalId" | "projectId" | "noteId", id: string, kind?: NodeKind) => {
    if (!id) return;
    store.getState().updateNode(node.id, { [field]: id, ...(kind ? { kind } : {}) });
  };
  const ref = (type: string, id: string) => <AppearsElsewhere type={type} id={id} mapNodeId={node.id} />;

  return (
    <Section title="Linked to">
      <div className="space-y-2.5">
        {l?.task && (
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-2">
              <Badge color="#10b981">Task</Badge>
              <Link href={`/tasks?task=${l.task.id}`} className="flex-1 truncate text-sm font-medium hover:underline">{l.task.title}</Link>
              {!readOnly && <button className="text-muted hover:text-text" onClick={() => unlink("taskId")} aria-label="Unlink task" title="Unlink (keeps the task)"><Unlink className="size-3.5" /></button>}
            </div>
            <Select className="mt-2 h-8" value={l.task.status} disabled={readOnly} onChange={(e) => actions.setTaskStatus(node.id, e.target.value)} aria-label="Task status">
              <option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option>
            </Select>
            {ref("task", l.task.id)}
          </div>
        )}
        {l?.goal && (
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-2">
              <Badge color="#ef4444">Goal</Badge>
              <Link href={`/goals/${l.goal.id}`} className="flex-1 truncate text-sm font-medium hover:underline">{l.goal.title}</Link>
              {!readOnly && <button className="text-muted hover:text-text" onClick={() => unlink("goalId")} aria-label="Unlink goal"><Unlink className="size-3.5" /></button>}
            </div>
            <div className="mt-2 flex items-center gap-2"><Progress value={l.goal.progress} size="sm" /><span className="text-xs tabular text-muted">{l.goal.progress}%</span></div>
            {ref("goal", l.goal.id)}
          </div>
        )}
        {l?.project && (
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-2">
              <Badge color="#8b5cf6">Project</Badge>
              <Link href={`/projects/${l.project.id}`} className="flex-1 truncate text-sm font-medium hover:underline">{l.project.title}</Link>
              {!readOnly && <button className="text-muted hover:text-text" onClick={() => unlink("projectId")} aria-label="Unlink project"><Unlink className="size-3.5" /></button>}
            </div>
            <div className="mt-2 flex items-center gap-2"><Progress value={l.project.progress} size="sm" /><span className="text-xs tabular text-muted">{l.project.progress}%</span></div>
            {ref("project", l.project.id)}
          </div>
        )}
        {l?.habit && (
          <div className="rounded-xl border border-border p-2.5 flex items-center gap-2">
            <Badge color="#14b8a6">Habit</Badge>
            <Link href="/habits" className="flex-1 truncate text-sm font-medium hover:underline">{l.habit.icon} {l.habit.title}</Link>
            {!readOnly && <button className="text-muted hover:text-text" onClick={() => unlink("habitId")} aria-label="Unlink habit"><Unlink className="size-3.5" /></button>}
          </div>
        )}
        {l?.note ? (
          <div className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted" />
              <Link href={`/notes/${l.note.id}`} className="flex-1 truncate text-sm font-medium hover:underline">{l.note.title}</Link>
              {!readOnly && <button className="text-muted hover:text-text" onClick={() => unlink("noteId")} aria-label="Unlink note"><Unlink className="size-3.5" /></button>}
            </div>
            {l.note.preview && <p className="mt-1.5 line-clamp-3 text-xs text-muted">{l.note.preview}</p>}
            <Link href={`/notes/${l.note.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">Open full note <ExternalLink className="size-3" /></Link>
          </div>
        ) : null}

        {!readOnly && (
          <>
            <p className="pt-1 text-xs text-muted">Turn this thought into something actionable:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {!d.taskId && (
                <Button size="sm" loading={busy === "TASK"} onClick={() => run("TASK", () => actions.convert(node.id, "TASK", { goalId: goalFor || d.goalId || null }))}>✅ Make task</Button>
              )}
              {!d.goalId && <Button size="sm" loading={busy === "GOAL"} onClick={() => run("GOAL", () => actions.convert(node.id, "GOAL"))}>🎯 Make goal</Button>}
              {!d.projectId && <Button size="sm" loading={busy === "PROJECT"} onClick={() => run("PROJECT", () => actions.convert(node.id, "PROJECT", { goalId: goalFor || null }))}>📦 Make project</Button>}
              {!d.habitId && <Button size="sm" loading={busy === "HABIT"} onClick={() => run("HABIT", () => actions.convert(node.id, "HABIT", { goalId: goalFor || null }))}>🔁 Make habit</Button>}
              {!d.noteId && <Button size="sm" className="col-span-2" loading={busy === "NOTE"} onClick={() => run("NOTE", () => actions.convert(node.id, "NOTE"))}>📝 Write a full note</Button>}
            </div>
            {(!d.taskId || !d.projectId || !d.habitId) && (
              <Field label="…supporting goal (optional)">
                <Select className="h-8" value={goalFor} onChange={(e) => setGoalFor(e.target.value)}>
                  <option value="">None</option>
                  {goals?.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </Select>
              </Field>
            )}
            <details className="rounded-lg border border-border px-2.5 py-1.5 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-muted">Link an existing item instead</summary>
              <div className="mt-2 space-y-2 pb-1">
                {!d.goalId && (
                  <Select className="h-8" value="" onChange={(e) => linkExisting("goalId", e.target.value, d.kind === "THOUGHT" ? "GOAL" : undefined)} aria-label="Link goal">
                    <option value="">Goal…</option>{goals?.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </Select>
                )}
                {!d.projectId && (
                  <Select className="h-8" value="" onChange={(e) => linkExisting("projectId", e.target.value, d.kind === "THOUGHT" ? "PROJECT" : undefined)} aria-label="Link project">
                    <option value="">Project…</option>{projects?.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </Select>
                )}
                {!d.noteId && (
                  <Select className="h-8" value="" onChange={(e) => linkExisting("noteId", e.target.value)} aria-label="Link note">
                    <option value="">Note…</option>{notes?.notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                  </Select>
                )}
              </div>
            </details>
          </>
        )}
      </div>
    </Section>
  );
}

function AppearsElsewhere({ type, id, mapNodeId }: { type: string; id: string; mapNodeId: string }) {
  const { mapId } = useMapCtx();
  const { data } = useApi<{ placements: { nodeId: string; mapId: string; mapTitle: string }[] }>(`/api/related?type=${type}&id=${id}`);
  const others = data?.placements.filter((p) => p.nodeId !== mapNodeId) ?? [];
  if (!others.length) return null;
  return (
    <div className="mt-2 text-xs text-muted">
      Also on:{" "}
      {others.map((p, i) => (
        <span key={p.nodeId}>{i > 0 && ", "}<Link className="text-accent hover:underline" href={`/maps/${p.mapId}?node=${p.nodeId}`}>{p.mapId === mapId ? "this map" : p.mapTitle}</Link></span>
      ))}
    </div>
  );
}

function AttachmentsSection({ nodeId, actions }: { nodeId: string; actions: PanelActions }) {
  const { readOnly, store } = useMapCtx();
  const ws = useWorkspace((s) => s.id);
  const { data, mutate } = useApi<{ attachments: Attachment[] }>(`/api/attachments?nodeId=${nodeId}`);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      await actions.flush();
      const fd = new FormData();
      fd.set("file", file); fd.set("ws", ws!); fd.set("nodeId", nodeId);
      const res = await fetch(withParams("/api/attachments", ws), { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      await mutate();
      const n = store.getState().nodes.find((x) => x.id === nodeId);
      if (n) store.getState().set((s) => ({ nodes: s.nodes.map((x) => (x.id === nodeId ? { ...x, data: { ...x.data, attachmentCount: (x.data.attachmentCount ?? 0) + 1 } } : x)) }));
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  return (
    <Section title="Files" action={!readOnly && <Button size="xs" variant="ghost" loading={busy} onClick={() => input.current?.click()}><Upload className="size-3" /> Upload</Button>}>
      <input ref={input} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      {!data?.attachments.length && <p className="text-xs text-muted">Attach images, PDFs or documents (max 10 MB).</p>}
      <ul className="space-y-1">
        {data?.attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm">
            <Paperclip className="size-3.5 text-muted" />
            <a href={`/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">{a.filename}</a>
            <span className="text-[11px] text-muted">{bytes(a.size)}</span>
            {!readOnly && <button className="text-muted hover:text-danger" aria-label="Delete file" onClick={async () => { await api(`/api/attachments/${a.id}`, { method: "DELETE" }); mutate(); }}><X className="size-3.5" /></button>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function MoveToMap({ nodeId, actions }: { nodeId: string; actions: PanelActions }) {
  const { mapId } = useMapCtx();
  const [open, setOpen] = useState(false);
  const { data } = useApi<{ maps: MapSummary[] }>(open ? "/api/maps" : null);
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><MoveRight className="size-3.5" /> Move…</Button>;
  return (
    <Select className="h-8" autoFocus value="" onBlur={() => setOpen(false)} onChange={(e) => e.target.value && actions.moveToMap(nodeId, e.target.value)} aria-label="Move to map">
      <option value="">Move to map…</option>
      {data?.maps.filter((m) => m.id !== mapId).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
    </Select>
  );
}

export function EdgePanel({ edge, onClose, onRemove }: { edge: RelationEdge; onClose: () => void; onRemove: () => void }) {
  const { store, readOnly } = useMapCtx();
  const nodes = useMap((s) => s.nodes);
  const d = edge.data!;
  const name = (id: string) => nodes.find((n) => n.id === id)?.data.title || "Untitled";
  const upd = (data: Partial<typeof d>) => store.getState().set((s) => ({ edges: s.edges.map((e) => (e.id === edge.id ? { ...e, data: { ...e.data!, ...data } } : e)), version: s.version + 1 }));
  const cp = () => store.getState().checkpoint();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="flex-1 text-sm font-semibold">Connection</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel"><X className="size-4" /></Button>
      </div>
      <div className="space-y-3.5 overflow-y-auto px-4 pb-4">
        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          <p className="font-medium">{name(edge.source)}</p>
          <p className="my-1 text-xs font-semibold" style={{ color: RELATION_META[d.relation].color }}>{d.bidirectional ? "⟷" : "↓"} {RELATION_META[d.relation].label}</p>
          <p className="font-medium">{name(edge.target)}</p>
        </div>
        <Field label="Relationship">
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(RELATION_META) as Relation[]).map((r) => (
              <button key={r} disabled={readOnly} onClick={() => store.getState().updateEdge(edge.id, { relation: r })}
                className={cn("rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors", d.relation === r ? "border-current bg-surface-2" : "border-border hover:bg-surface-2")}
                style={{ color: RELATION_META[r].color }}>
                {RELATION_META[r].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Label"><Input value={d.label} disabled={readOnly} onFocus={cp} onChange={(e) => upd({ label: e.target.value })} placeholder="Optional short label" /></Field>
        <Field label="Description"><Textarea rows={3} value={d.description} disabled={readOnly} onFocus={cp} onChange={(e) => upd({ description: e.target.value })} placeholder="Why are these connected?" /></Field>
        {!readOnly && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[var(--accent)]" checked={d.bidirectional} onChange={(e) => store.getState().updateEdge(edge.id, { bidirectional: e.target.checked })} />
              Bidirectional
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => store.getState().commit((s) => ({ edges: s.edges.map((e) => (e.id === edge.id ? { ...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle } : e)) }))}>
                <ArrowLeftRight className="size-3.5" /> Reverse
              </Button>
              <Button size="sm" variant="outline" className="text-danger" onClick={onRemove}><Trash2 className="size-3.5" /> Delete</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function LegendPanel() {
  return (
    <div className="space-y-1 text-xs">
      {(Object.keys(RELATION_META) as Relation[]).map((r) => (
        <div key={r} className="flex items-center gap-2">
          <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke={RELATION_META[r].color} strokeWidth="2" strokeDasharray={RELATION_META[r].dashed ? "4 3" : undefined} /></svg>
          <span className="text-text-2">{RELATION_META[r].label}</span>
        </div>
      ))}
    </div>
  );
}
