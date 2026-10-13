import { prisma } from "@/lib/db";
import { route, userAndWorkspace } from "@/lib/http";
import { docToMarkdown } from "@/lib/richtext";

/** Portable export of a workspace: ?format=json (complete, re-importable) or markdown. */
export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const format = new URL(req.url).searchParams.get("format") === "markdown" ? "markdown" : "json";
  const ws = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      folders: true,
      notes: { include: { linksOut: { select: { targetId: true } } } },
      maps: { include: { nodes: true, edges: true } },
      projects: true,
      goals: { include: { milestones: true, dependsOn: true } },
      tasks: { include: { dependsOn: true } },
      habits: { include: { logs: true } },
      events: { include: { goals: true } },
    },
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = ws.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  if (format === "json") {
    const body = JSON.stringify({ format: "nodera-export", version: 1, exportedAt: new Date().toISOString(), workspace: ws }, null, 2);
    return new Response(body, {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="nodera-${safeName}-${stamp}.json"` },
    });
  }

  const folderName = new Map(ws.folders.map((f) => [f.id, f.name]));
  const lines: string[] = [`# ${ws.name}`, "", `_Exported from Nodera on ${stamp}_`, ""];
  lines.push("## Goals", "");
  for (const g of ws.goals) {
    lines.push(`### ${g.title} (${g.status.toLowerCase()})`);
    if (g.description) lines.push("", g.description);
    if (g.motivation) lines.push("", `**Motivation:** ${g.motivation}`);
    if (g.successCriteria) lines.push("", `**Success criteria:** ${g.successCriteria}`);
    if (g.milestones.length) lines.push("", ...g.milestones.sort((a, b) => a.position - b.position).map((m) => `- [${m.done ? "x" : " "}] ${m.title}`));
    lines.push("");
  }
  lines.push("## Projects & tasks", "");
  const byProject = new Map<string | null, typeof ws.tasks>();
  for (const t of ws.tasks) byProject.set(t.projectId, [...(byProject.get(t.projectId) ?? []), t]);
  for (const p of ws.projects) {
    lines.push(`### ${p.title}`, p.description ? `\n${p.description}\n` : "");
    for (const t of byProject.get(p.id) ?? []) lines.push(`- [${t.status === "DONE" ? "x" : " "}] ${t.title}${t.dueDate ? ` (due ${t.dueDate.toISOString().slice(0, 10)})` : ""}`);
    lines.push("");
  }
  const loose = byProject.get(null) ?? [];
  if (loose.length) lines.push("### Other tasks", ...loose.map((t) => `- [${t.status === "DONE" ? "x" : " "}] ${t.title}`), "");
  lines.push("## Habits", "", ...ws.habits.map((h) => `- ${h.icon} ${h.title} — ${h.targetPerPeriod} ${h.unit} ${h.frequency.toLowerCase()} (${h.logs.length} logged days)`), "");
  lines.push("## Mind maps", "");
  for (const m of ws.maps) {
    const title = new Map(m.nodes.map((n) => [n.id, n.title || "(untitled)"]));
    lines.push(`### ${m.title}`, "", ...m.nodes.map((n) => `- **${n.title || "(untitled)"}** _${n.kind.toLowerCase()}_${n.description ? ` — ${n.description}` : ""}`), "");
    if (m.edges.length) lines.push("Connections:", "", ...m.edges.map((e) => `- ${title.get(e.sourceId)} —${e.relation.replace(/_/g, " ").toLowerCase()}${e.label ? ` (${e.label})` : ""}→ ${title.get(e.targetId)}`), "");
  }
  lines.push("## Notes", "");
  for (const n of ws.notes) {
    lines.push(`---`, "", `### ${n.title}`, "", `_${n.kind.toLowerCase()} · ${n.folderId ? folderName.get(n.folderId) : "No folder"} · created ${n.createdAt.toISOString().slice(0, 10)}${n.tags.length ? ` · #${n.tags.join(" #")}` : ""}_`, "", docToMarkdown(n.content));
  }
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="nodera-${safeName}-${stamp}.md"` },
  });
});
