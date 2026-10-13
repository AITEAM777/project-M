"use client";
import { getLocale, tr } from "./index";

/** Activity summaries are stored in English; this renders them in the UI language. */
const PATTERNS: [RegExp, string][] = [
  [/^Accepted AI suggestion: (.+)$/, "Прийнято пропозицію AI: $1"],
  [/^Set goal “(.+)”$/, "Поставлено ціль «$1»"],
  [/^Achieved goal “(.+)” 🎉$/, "Досягнуто ціль «$1» 🎉"],
  [/^Deleted goal “(.+)”$/, "Видалено ціль «$1»"],
  [/^Created project “(.+)”$/, "Створено проєкт «$1»"],
  [/^Completed project “(.+)”$/, "Завершено проєкт «$1»"],
  [/^Deleted project “(.+)”$/, "Видалено проєкт «$1»"],
  [/^Added task “(.+)”$/, "Додано задачу «$1»"],
  [/^Completed “(.+)”$/, "Виконано «$1»"],
  [/^Deleted task “(.+)”$/, "Видалено задачу «$1»"],
  [/^Created folder “(.+)”$/, "Створено папку «$1»"],
  [/^Deleted folder “(.+)”$/, "Видалено папку «$1»"],
  [/^Captured “(.+)”$/, "Записано «$1»"],
  [/^Archived map “(.+)”$/, "Архівовано карту «$1»"],
  [/^Restored map “(.+)”$/, "Відновлено карту «$1»"],
  [/^Archived “(.+)”$/, "Архівовано «$1»"],
  [/^Restored “(.+)”$/, "Відновлено «$1»"],
  [/^Deleted “(.+)”$/, "Видалено «$1»"],
  [/^Reached milestone “(.+)” \((.+)\)$/, "Досягнуто етап «$1» ($2)"],
  [/^Created mind map “(.+)”$/, "Створено карту думок «$1»"],
  [/^Deleted map “(.+)”$/, "Видалено карту «$1»"],
  [/^Turned “(.+)” into a (task|note|goal|project|habit)$/, "«$1» перетворено на: $2"],
  [/^Started habit “(.+)”$/, "Розпочато звичку «$1»"],
  [/^(.+) — done for (\d{4}-\d{2}-\d{2})$/, "$1 — виконано за $2"],
];

const KINDS: Record<string, string> = { task: "задачу", note: "нотатку", goal: "ціль", project: "проєкт", habit: "звичку" };

export function trActivity(summary: string): string {
  if (getLocale() !== "uk") return summary;
  for (const [re, tpl] of PATTERNS) {
    const m = summary.match(re);
    if (m) {
      if (re.source.startsWith("^Turned")) return `«${m[1]}» перетворено на ${KINDS[m[2]] ?? m[2]}`;
      return tpl.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? "");
    }
  }
  return tr(summary);
}
