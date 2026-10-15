import { getLocale } from "@/lib/i18n";

/** Link to the public tutorial (/guide) in the current UI language, optionally at one section. */
export function guideHref(section?: string) {
  return `/guide?lang=${getLocale()}${section ? `#${section}` : ""}`;
}

/** Which tutorial section explains the page a tour belongs to. */
export const TOUR_SECTION: Record<string, string> = {
  dashboard: "dashboard", thoughts: "thoughts", notes: "notes", note: "notes", maps: "maps", map: "maps",
  projects: "projects", project: "projects", tasks: "tasks", goals: "goals", goal: "goals", calendar: "calendar",
  habits: "habits", graph: "graph", timeline: "timeline", folders: "folders",
};
