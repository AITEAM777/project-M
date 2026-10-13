import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";

export function relDay(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  const diff = differenceInCalendarDays(date, new Date());
  if (diff > 0 && diff < 7) return format(date, "EEEE");
  return format(date, diff > 300 || diff < -300 ? "d MMM yyyy" : "d MMM");
}

export function ago(d: string | Date) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 45) return "just now";
  return formatDistanceToNowStrict(new Date(d), { addSuffix: true });
}

export function time(d: string | Date) {
  return format(new Date(d), "HH:mm");
}

export function isOverdue(d: string | null | undefined, status?: string) {
  if (!d || status === "DONE") return false;
  return differenceInCalendarDays(new Date(d), new Date()) < 0;
}

export function minutes(m: number | null | undefined) {
  if (!m) return "";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** Value for <input type="date"> from an ISO date (local). */
export function toDateInput(d: string | null | undefined) {
  return d ? format(new Date(d), "yyyy-MM-dd") : "";
}
export function toDateTimeInput(d: string | Date | null | undefined) {
  return d ? format(new Date(d), "yyyy-MM-dd'T'HH:mm") : "";
}
/** Local date input → ISO at local noon (stable across timezones for due dates). */
export function fromDateInput(v: string) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}
