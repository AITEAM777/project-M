/** What each plan includes — shown on the billing page and in the upgrade dialog. Keys are i18n source strings. */
export const FEATURES: Record<"FREE" | "PRO" | "MAX", { intro: string; items: { text: string; soon?: boolean }[] }> = {
  FREE: {
    intro: "What's included",
    items: [
      { text: "Unlimited thoughts, notes and tasks" },
      { text: "Recurring tasks, calendar and dashboard" },
      { text: "Command bar that understands plain language" },
      { text: "3 active goals with milestones and progress" },
      { text: "3 mind maps, up to 150 cards each" },
      { text: "3 habits with streaks and statistics" },
      { text: "3 active projects" },
      { text: "Focus mode on maps and goal celebrations" },
      { text: "AI assistant: 10 requests a day" },
      { text: "1 space · 100 MB of files" },
      { text: "Timeline for the last 30 days" },
      { text: "Export and import of all your data" },
    ],
  },
  PRO: {
    intro: "Everything in Start, plus",
    items: [
      { text: "Unlimited goals, habits, projects and maps" },
      { text: "Up to 2,000 cards per map" },
      { text: "“Path to goal”: what blocks it and the next step" },
      { text: "Ready-made structures: startup, SWOT, 5 whys, decisions" },
      { text: "AI assistant: 200 requests a day" },
      { text: "5 spaces — work, home, study…" },
      { text: "5 GB of files in notes and maps" },
      { text: "Full timeline history" },
      { text: "Share your goal achievements as an image" },
      { text: "Priority access to new features" },
    ],
  },
  MAX: {
    intro: "Everything in Pro, plus",
    items: [
      { text: "AI assistant: 1,000 requests a day" },
      { text: "Up to 10,000 cards per map" },
      { text: "Unlimited spaces · 50 GB of files" },
      { text: "“Plan my day” — an automatic schedule", soon: true },
      { text: "AI coach with a weekly review", soon: true },
      { text: "Share maps and goals with other people", soon: true },
      { text: "Early access to every new feature" },
      { text: "Direct support from the team" },
    ],
  },
};

export const TAGLINE = {
  FREE: "Get your head in order",
  PRO: "For people who work on goals every day",
  MAX: "Maximum AI and room for big plans",
} as const;

/** Comparison table rows: [label, Start, Pro, Max]. */
export const COMPARE: [string, string, string, string][] = [
  ["Thoughts, notes, tasks", "∞", "∞", "∞"],
  ["Active goals", "3", "∞", "∞"],
  ["Habits", "3", "∞", "∞"],
  ["Active projects", "3", "∞", "∞"],
  ["Mind maps", "3", "∞", "∞"],
  ["Cards per map", "150", "2 000", "10 000"],
  ["Path to goal", "—", "✓", "✓"],
  ["Ready-made structures", "—", "✓", "✓"],
  ["Focus mode, celebrations", "✓", "✓", "✓"],
  ["AI requests a day", "10", "200", "1 000"],
  ["Spaces", "1", "5", "∞"],
  ["Files", "100 MB", "5 GB", "50 GB"],
  ["Timeline history", "30 days", "full", "full"],
  ["Export & import", "✓", "✓", "✓"],
];
