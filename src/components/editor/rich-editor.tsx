"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Code, CodeSquare, Heading1, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListChecks, ListOrdered, Minus, NotebookPen, Quote,
  Redo2, Strikethrough, Table as TableIcon, Underline as UnderlineIcon, Undo2,
} from "lucide-react";
import { useApi, withParams } from "@/lib/client/api";
import { toast, useWorkspace } from "@/lib/client/store";
import { useDebouncedValue } from "@/lib/client/hooks";
import type { NoteSummary } from "@/lib/client/types";
import { cn } from "@/lib/utils";
import { MenuItem, MenuSeparator, Popover, Tooltip } from "@/components/ui/misc";

export function RichEditor({ noteId, content, onChange, onUploaded }: { noteId: string; content: unknown; onChange: (doc: unknown) => void; onUploaded?: () => void }) {
  const router = useRouter();
  const ws = useWorkspace((s) => s.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: "Start writing… type freely, use the toolbar or Markdown shortcuts (#, -, [ ], >, ```)" }),
    ],
    content: (content as object) ?? "",
    editorProps: {
      attributes: { class: "prose-nodera min-h-[50vh] pb-24", "aria-label": "Note content" },
      handleClick: (_view, _pos, event) => {
        const a = (event.target as HTMLElement).closest("a");
        if (!a) return false;
        const href = a.getAttribute("href") ?? "";
        if (href.startsWith("/notes/")) { event.preventDefault(); router.push(href); return true; }
        if (event.metaKey || event.ctrlKey) { window.open(href, "_blank", "noopener"); return true; }
        return false;
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file?.type.startsWith("image/")) { event.preventDefault(); void upload(file); return true; }
        return false;
      },
      handlePaste: (_view, event) => {
        const file = event.clipboardData?.files?.[0];
        if (file?.type.startsWith("image/")) { event.preventDefault(); void upload(file); return true; }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  async function upload(file: File) {
    try {
      const fd = new FormData();
      fd.set("file", file); fd.set("ws", ws!); fd.set("noteId", noteId);
      const res = await fetch(withParams("/api/attachments", ws), { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      if (file.type.startsWith("image/")) editor?.chain().focus().setImage({ src: j.url, alt: file.name }).run();
      else editor?.chain().focus().insertContent({ type: "text", text: file.name, marks: [{ type: "link", attrs: { href: j.url } }] }).run();
      onUploaded?.();
    } catch (e) { toast.error(e); }
  }

  if (!editor) return <div className="min-h-[50vh]" />;
  return (
    <div>
      <Toolbar editor={editor} onPickFile={() => fileInput.current?.click()} />
      <input ref={fileInput} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, onPickFile }: { editor: Editor; onPickFile: () => void }) {
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"), code: e.isActive("code"),
      h1: e.isActive("heading", { level: 1 }), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), task: e.isActive("taskList"), quote: e.isActive("blockquote"), codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"), table: e.isActive("table"), canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  });
  const B = ({ on, label, icon: Icon, run, disabled }: { on?: boolean; label: string; icon: React.ElementType; run: () => void; disabled?: boolean }) => (
    <Tooltip label={label} side="bottom">
      <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={run} aria-label={label} aria-pressed={on}
        className={cn("grid size-8 place-items-center rounded-md transition-colors disabled:opacity-30", on ? "bg-accent-soft text-accent" : "text-text-2 hover:bg-surface-2")}>
        <Icon className="size-4" />
      </button>
    </Tooltip>
  );
  const c = () => editor.chain().focus();
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (!url) return c().extendMarkRange("link").unsetLink().run();
    c().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className="sticky top-0 z-10 -mx-2 mb-4 flex flex-wrap items-center gap-0.5 rounded-xl border border-border bg-surface/95 p-1 shadow-soft backdrop-blur">
      <B label="Undo" icon={Undo2} run={() => c().undo().run()} disabled={!st.canUndo} />
      <B label="Redo" icon={Redo2} run={() => c().redo().run()} disabled={!st.canRedo} />
      <span className="mx-1 h-5 w-px bg-border" />
      <B label="Heading 1" icon={Heading1} on={st.h1} run={() => c().toggleHeading({ level: 1 }).run()} />
      <B label="Heading 2" icon={Heading2} on={st.h2} run={() => c().toggleHeading({ level: 2 }).run()} />
      <B label="Heading 3" icon={Heading3} on={st.h3} run={() => c().toggleHeading({ level: 3 }).run()} />
      <span className="mx-1 h-5 w-px bg-border" />
      <B label="Bold (⌘B)" icon={Bold} on={st.bold} run={() => c().toggleBold().run()} />
      <B label="Italic (⌘I)" icon={Italic} on={st.italic} run={() => c().toggleItalic().run()} />
      <B label="Underline (⌘U)" icon={UnderlineIcon} on={st.underline} run={() => c().toggleUnderline().run()} />
      <B label="Strikethrough" icon={Strikethrough} on={st.strike} run={() => c().toggleStrike().run()} />
      <B label="Inline code" icon={Code} on={st.code} run={() => c().toggleCode().run()} />
      <span className="mx-1 h-5 w-px bg-border" />
      <B label="Bullet list" icon={List} on={st.ul} run={() => c().toggleBulletList().run()} />
      <B label="Numbered list" icon={ListOrdered} on={st.ol} run={() => c().toggleOrderedList().run()} />
      <B label="Checklist" icon={ListChecks} on={st.task} run={() => c().toggleTaskList().run()} />
      <B label="Quote" icon={Quote} on={st.quote} run={() => c().toggleBlockquote().run()} />
      <B label="Code block" icon={CodeSquare} on={st.codeBlock} run={() => c().toggleCodeBlock().run()} />
      <B label="Divider" icon={Minus} run={() => c().setHorizontalRule().run()} />
      <span className="mx-1 h-5 w-px bg-border" />
      <B label="Link" icon={Link2} on={st.link} run={setLink} />
      <NoteLinkPicker editor={editor} />
      <B label="Image or file" icon={ImagePlus} run={onPickFile} />
      <Popover trigger={({ toggle }) => <B label="Table" icon={TableIcon} on={st.table} run={toggle} />}>
        {(close) => (
          <>
            <MenuItem onClick={() => { close(); c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }}>Insert 3×3 table</MenuItem>
            <MenuSeparator />
            <MenuItem disabled={!st.table} onClick={() => { close(); c().addRowAfter().run(); }}>Add row</MenuItem>
            <MenuItem disabled={!st.table} onClick={() => { close(); c().addColumnAfter().run(); }}>Add column</MenuItem>
            <MenuItem disabled={!st.table} onClick={() => { close(); c().deleteRow().run(); }}>Delete row</MenuItem>
            <MenuItem disabled={!st.table} onClick={() => { close(); c().deleteColumn().run(); }}>Delete column</MenuItem>
            <MenuItem disabled={!st.table} danger onClick={() => { close(); c().deleteTable().run(); }}>Delete table</MenuItem>
          </>
        )}
      </Popover>
    </div>
  );
}

/** Inserts an internal link to another note (creates a backlink on save). */
function NoteLinkPicker({ editor }: { editor: Editor }) {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 200);
  const [open, setOpen] = useState(false);
  const { data } = useApi<{ notes: NoteSummary[] }>(open ? `/api/notes?limit=20${dq ? `&q=${encodeURIComponent(dq)}` : ""}` : null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 10); }, [open]);
  return (
    <Popover open={open} onOpenChange={setOpen} className="w-72" trigger={() => (
      <Tooltip label="Link to another note" side="bottom">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(!open)} aria-label="Link to another note" className="grid size-8 place-items-center rounded-md text-text-2 hover:bg-surface-2"><NotebookPen className="size-4" /></button>
      </Tooltip>
    )}>
      <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="mb-1 h-8 w-full rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-accent" />
      {data?.notes.map((n) => (
        <MenuItem key={n.id} onClick={() => {
          const { from, to } = editor.state.selection;
          const text = from === to ? n.title : editor.state.doc.textBetween(from, to);
          editor.chain().focus().insertContentAt({ from, to }, { type: "text", text, marks: [{ type: "link", attrs: { href: `/notes/${n.id}` } }] }).insertContent(" ").run();
          setOpen(false);
          setQ("");
        }}>{n.kind === "THOUGHT" ? "💭" : "📝"} {n.title}</MenuItem>
      ))}
      {data && !data.notes.length && <p className="px-2 py-2 text-sm text-muted">No notes found.</p>}
    </Popover>
  );
}
