/** Pure scheduling helpers: recurrence expansion, conflict detection, free-slot search. */

export type Recurrence = "NONE" | "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY";

export interface TimeBlock {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  source?: "event" | "task";
  sourceId?: string;
  color?: string;
  goalIds?: string[];
}

export interface RecurringBlock extends TimeBlock {
  recurrence: Recurrence;
  recurUntil?: Date | null;
}

const DAY = 86400_000;

function addInterval(d: Date, r: Recurrence): Date {
  const n = new Date(d);
  switch (r) {
    case "DAILY":
      n.setDate(n.getDate() + 1);
      break;
    case "WEEKDAYS":
      do n.setDate(n.getDate() + 1);
      while (n.getDay() === 0 || n.getDay() === 6);
      break;
    case "WEEKLY":
      n.setDate(n.getDate() + 7);
      break;
    case "MONTHLY":
      n.setMonth(n.getMonth() + 1);
      break;
    default:
      n.setTime(Number.MAX_SAFE_INTEGER);
  }
  return n;
}

/** Expands recurring blocks into concrete occurrences overlapping [from, to). */
export function expandRecurring(blocks: RecurringBlock[], from: Date, to: Date, maxPerBlock = 400): TimeBlock[] {
  const out: TimeBlock[] = [];
  for (const b of blocks) {
    const duration = b.end.getTime() - b.start.getTime();
    if (b.recurrence === "NONE") {
      if (b.end > from && b.start < to) out.push(stripRecurrence(b));
      continue;
    }
    let s = new Date(b.start);
    let i = 0;
    const until = b.recurUntil ? Math.min(b.recurUntil.getTime() + DAY, to.getTime()) : to.getTime();
    while (s.getTime() < until && i < maxPerBlock + 2000) {
      const e = new Date(s.getTime() + duration);
      if (e > from && s < to) {
        out.push({ ...stripRecurrence(b), id: `${b.id}@${s.toISOString()}`, start: new Date(s), end: e });
        if (out.length > maxPerBlock * blocks.length) break;
      }
      s = addInterval(s, b.recurrence);
      i++;
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function stripRecurrence(b: RecurringBlock): TimeBlock {
  const { recurrence, recurUntil, ...rest } = b;
  return rest;
}

export interface Conflict {
  a: TimeBlock;
  b: TimeBlock;
  overlapMinutes: number;
}

/** Returns every pair of timed (non all-day) blocks that overlap. O(n log n + k). */
export function findConflicts(blocks: TimeBlock[]): Conflict[] {
  const timed = blocks.filter((b) => !b.allDay).sort((a, b) => a.start.getTime() - b.start.getTime());
  const conflicts: Conflict[] = [];
  const active: TimeBlock[] = [];
  for (const cur of timed) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= cur.start) active.splice(i, 1);
    }
    for (const other of active) {
      const overlap = Math.min(other.end.getTime(), cur.end.getTime()) - cur.start.getTime();
      if (overlap > 0) conflicts.push({ a: other, b: cur, overlapMinutes: Math.round(overlap / 60000) });
    }
    active.push(cur);
  }
  return conflicts;
}

/**
 * Finds free slots of at least `durationMin` on a given day between working hours,
 * avoiding existing blocks. Returns up to `limit` slot starts.
 */
export function suggestSlots(
  blocks: TimeBlock[],
  day: Date,
  durationMin: number,
  opts: { dayStartHour?: number; dayEndHour?: number; stepMin?: number; limit?: number } = {},
): { start: Date; end: Date }[] {
  const { dayStartHour = 7, dayEndHour = 22, stepMin = 15, limit = 3 } = opts;
  const start = new Date(day);
  start.setHours(dayStartHour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(dayEndHour, 0, 0, 0);
  const busy = blocks
    .filter((b) => !b.allDay && b.end > start && b.start < end)
    .map((b) => [b.start.getTime(), b.end.getTime()] as const)
    .sort((a, b) => a[0] - b[0]);
  const res: { start: Date; end: Date }[] = [];
  const dur = durationMin * 60000;
  let t = start.getTime();
  while (t + dur <= end.getTime() && res.length < limit) {
    const clash = busy.find(([s, e]) => s < t + dur && e > t);
    if (clash) {
      t = Math.ceil(clash[1] / (stepMin * 60000)) * stepMin * 60000;
      continue;
    }
    res.push({ start: new Date(t), end: new Date(t + dur) });
    t += dur;
  }
  return res;
}

/** Minutes per goal from blocks; an activity linked to several goals counts for each. */
export function minutesByGoal(blocks: TimeBlock[]) {
  const m = new Map<string, number>();
  for (const b of blocks) {
    const mins = (b.end.getTime() - b.start.getTime()) / 60000;
    for (const g of b.goalIds ?? []) m.set(g, (m.get(g) ?? 0) + mins);
  }
  return m;
}
