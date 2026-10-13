/** Pure habit statistics. Dates are handled as YYYY-MM-DD keys (calendar days). */

export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Converts a DB @db.Date (UTC midnight) into a YYYY-MM-DD key. */
export function utcDayKey(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

export function parseDayKey(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Monday-based week key. */
export function weekKey(d: Date) {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - dow);
  return dayKey(r);
}

export interface HabitLike {
  frequency: "DAILY" | "WEEKLY";
  targetPerPeriod: number;
}

/** counts: map of dayKey -> completions. */
export function habitStats(h: HabitLike, counts: Record<string, number>, today = new Date()) {
  const target = Math.max(1, h.targetPerPeriod);
  if (h.frequency === "DAILY") {
    const met = (d: Date) => (counts[dayKey(d)] ?? 0) >= target;
    // Current streak: today counts if met; otherwise streak continues from yesterday.
    let streak = 0;
    let cursor = met(today) ? today : shiftDays(today, -1);
    while (met(cursor)) {
      streak++;
      cursor = shiftDays(cursor, -1);
    }
    let best = 0;
    let run = 0;
    const keys = Object.keys(counts).sort();
    if (keys.length) {
      let d = parseDayKey(keys[0]);
      while (d <= today) {
        if (met(d)) {
          run++;
          best = Math.max(best, run);
        } else run = 0;
        d = shiftDays(d, 1);
      }
    }
    const last30 = Array.from({ length: 30 }, (_, i) => shiftDays(today, -i));
    const rate30 = Math.round((last30.filter(met).length / 30) * 100);
    const last7 = Array.from({ length: 7 }, (_, i) => shiftDays(today, -i));
    const rate7 = Math.round((last7.filter(met).length / 7) * 100);
    return { streak, best, rate7, rate30, doneToday: counts[dayKey(today)] ?? 0, target };
  }
  // WEEKLY: sum completions per Monday-based week.
  const perWeek: Record<string, number> = {};
  for (const [k, c] of Object.entries(counts)) {
    const wk = weekKey(parseDayKey(k));
    perWeek[wk] = (perWeek[wk] ?? 0) + c;
  }
  const metWeek = (d: Date) => (perWeek[weekKey(d)] ?? 0) >= target;
  let streak = 0;
  let cursor = metWeek(today) ? today : shiftDays(today, -7);
  while (metWeek(cursor)) {
    streak++;
    cursor = shiftDays(cursor, -7);
  }
  let best = 0;
  let run = 0;
  const weeks = Object.keys(perWeek).sort();
  if (weeks.length) {
    let d = parseDayKey(weeks[0]);
    while (d <= today) {
      if (metWeek(d)) {
        run++;
        best = Math.max(best, run);
      } else run = 0;
      d = shiftDays(d, 7);
    }
  }
  const last4 = Array.from({ length: 4 }, (_, i) => shiftDays(today, -7 * i));
  const rate30 = Math.round((last4.filter(metWeek).length / 4) * 100);
  return {
    streak,
    best,
    rate7: metWeek(today) ? 100 : Math.round(((perWeek[weekKey(today)] ?? 0) / target) * 100),
    rate30,
    doneToday: counts[dayKey(today)] ?? 0,
    doneThisWeek: perWeek[weekKey(today)] ?? 0,
    target,
  };
}
