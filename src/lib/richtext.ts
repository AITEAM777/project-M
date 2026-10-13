/** Helpers for TipTap/ProseMirror JSON documents (server + client safe). */

export interface PMNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: PMNode[];
}

const BLOCKS = new Set(["paragraph", "heading", "listItem", "taskItem", "codeBlock", "blockquote", "tableCell", "tableHeader"]);

/** Plain-text projection used for full-text search and previews. */
export function docToText(doc: unknown, max = 100_000): string {
  const parts: string[] = [];
  const walk = (n: PMNode) => {
    if (n.text) parts.push(n.text);
    if (n.type === "hardBreak") parts.push("\n");
    n.content?.forEach(walk);
    if (n.type && BLOCKS.has(n.type)) parts.push("\n");
  };
  if (doc && typeof doc === "object") walk(doc as PMNode);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

/** Collects internal note ids referenced by links of the form `/notes/<id>`. */
export function extractNoteLinks(doc: unknown): string[] {
  const ids = new Set<string>();
  const walk = (n: PMNode) => {
    for (const m of n.marks ?? []) {
      if (m.type === "link") {
        const href = String(m.attrs?.href ?? "");
        const match = href.match(/^\/notes\/([a-z0-9]+)$/i);
        if (match) ids.add(match[1]);
      }
    }
    n.content?.forEach(walk);
  };
  if (doc && typeof doc === "object") walk(doc as PMNode);
  return [...ids];
}

/** Converts a document to Markdown (export). Covers the node types our editor produces. */
export function docToMarkdown(doc: unknown): string {
  const inline = (nodes: PMNode[] = []): string =>
    nodes
      .map((n) => {
        if (n.type === "hardBreak") return "  \n";
        if (n.type === "image") return `![${n.attrs?.alt ?? ""}](${n.attrs?.src ?? ""})`;
        let t = n.text ?? inline(n.content);
        for (const m of n.marks ?? []) {
          if (m.type === "bold") t = `**${t}**`;
          else if (m.type === "italic") t = `_${t}_`;
          else if (m.type === "strike") t = `~~${t}~~`;
          else if (m.type === "code") t = "`" + t + "`";
          else if (m.type === "link") t = `[${t}](${m.attrs?.href ?? ""})`;
        }
        return t;
      })
      .join("");

  const block = (n: PMNode, indent = ""): string => {
    switch (n.type) {
      case "doc":
        return (n.content ?? []).map((c) => block(c)).join("\n\n");
      case "paragraph":
        return indent + inline(n.content);
      case "heading":
        return "#".repeat(Number(n.attrs?.level ?? 1)) + " " + inline(n.content);
      case "blockquote":
        return (n.content ?? []).map((c) => "> " + block(c)).join("\n");
      case "codeBlock":
        return "```" + (n.attrs?.language ?? "") + "\n" + inline(n.content) + "\n```";
      case "horizontalRule":
        return "---";
      case "bulletList":
        return (n.content ?? []).map((li) => listItem(li, indent, "- ")).join("\n");
      case "orderedList":
        return (n.content ?? []).map((li, i) => listItem(li, indent, `${i + 1}. `)).join("\n");
      case "taskList":
        return (n.content ?? []).map((li) => listItem(li, indent, li.attrs?.checked ? "- [x] " : "- [ ] ")).join("\n");
      case "table": {
        const rows = (n.content ?? []).map((r) => (r.content ?? []).map((c) => (c.content ?? []).map((p) => inline(p.content)).join(" ")));
        if (!rows.length) return "";
        const head = `| ${rows[0].join(" | ")} |`;
        const sep = `| ${rows[0].map(() => "---").join(" | ")} |`;
        return [head, sep, ...rows.slice(1).map((r) => `| ${r.join(" | ")} |`)].join("\n");
      }
      case "image":
        return `![${n.attrs?.alt ?? ""}](${n.attrs?.src ?? ""})`;
      default:
        return inline(n.content);
    }
  };
  const listItem = (li: PMNode, indent: string, bullet: string) => {
    const [first, ...rest] = li.content ?? [];
    const head = indent + bullet + (first ? inline(first.content) : "");
    const tail = rest.map((c) => block(c, indent + "  ")).join("\n");
    return tail ? head + "\n" + tail : head;
  };
  if (!doc || typeof doc !== "object") return "";
  return block(doc as PMNode).trim() + "\n";
}

/** Builds a minimal doc from plain text (quick capture, AI-generated notes). */
export function textToDoc(text: string): PMNode {
  const paras = text.split(/\n{2,}|\n/).filter((p) => p.trim().length > 0);
  return {
    type: "doc",
    content: paras.length
      ? paras.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }))
      : [{ type: "paragraph" }],
  };
}
