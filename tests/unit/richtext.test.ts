import { describe, expect, it } from "vitest";
import { docToMarkdown, docToText, extractNoteLinks, textToDoc } from "@/lib/richtext";

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Plan" }] },
    { type: "paragraph", content: [{ type: "text", text: "See " }, { type: "text", text: "budget", marks: [{ type: "link", attrs: { href: "/notes/abc123" } }] }, { type: "text", text: " and ", marks: [] }, { type: "text", text: "bold", marks: [{ type: "bold" }] }] },
    { type: "taskList", content: [{ type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Done thing" }] }] }] },
  ],
};

describe("richtext", () => {
  it("extracts plain text for search", () => {
    expect(docToText(doc)).toContain("See budget and bold");
  });
  it("finds internal note links", () => {
    expect(extractNoteLinks(doc)).toEqual(["abc123"]);
  });
  it("exports markdown", () => {
    const md = docToMarkdown(doc);
    expect(md).toContain("## Plan");
    expect(md).toContain("[budget](/notes/abc123)");
    expect(md).toContain("**bold**");
    expect(md).toContain("- [x] Done thing");
  });
  it("builds docs from text", () => {
    expect(docToText(textToDoc("a\n\nb"))).toBe("a\nb");
  });
});
