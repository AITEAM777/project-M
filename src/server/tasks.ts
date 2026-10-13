import "server-only";
import type { Prisma } from "@prisma/client";

export const taskInclude = {
  project: { select: { id: true, title: true, color: true } },
  goal: { select: { id: true, title: true } },
  milestone: { select: { id: true, title: true } },
  nodes: { select: { id: true, mapId: true, map: { select: { title: true } } } },
  dependsOn: { select: { dependsOn: { select: { id: true, title: true, status: true } } } },
} satisfies Prisma.TaskInclude;

export function nextOccurrence(d: Date, r: string): Date | null {
  const n = new Date(d);
  switch (r) {
    case "DAILY": n.setDate(n.getDate() + 1); return n;
    case "WEEKDAYS": do n.setDate(n.getDate() + 1); while (n.getDay() === 0 || n.getDay() === 6); return n;
    case "WEEKLY": n.setDate(n.getDate() + 7); return n;
    case "MONTHLY": n.setMonth(n.getMonth() + 1); return n;
    default: return null;
  }
}
