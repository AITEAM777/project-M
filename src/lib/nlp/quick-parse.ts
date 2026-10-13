/**
 * Turns a plain-language phrase ("завтра о 9 пробіжка 5 км, до цілі марафон, щотижня")
 * into a structured item. Rule-based, Ukrainian + English, no network — runs on every keystroke.
 */

export type QuickKind = "task" | "goal" | "habit" | "note" | "thought";
export type Recurrence = "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY";
export type Priority = "HIGH" | "URGENT";

export interface Parsed {
  kind: QuickKind;
  /** true when the kind was stated explicitly ("ціль …", "habit: …") */
  kindExplicit: boolean;
  title: string;
  date: Date | null;
  /** minutes since midnight */
  time: number | null;
  endTime: number | null;
  duration: number | null;
  recurrence: Recurrence | null;
  goalQuery: string | null;
  goal: { id: string; title: string } | null;
  priority: Priority | null;
  tags: string[];
  /** HH:mm reminder for habits */
  reminder: string | null;
  /** How many structured hints were recognised (0 = probably a search query). */
  signals: number;
}

const L = "\\p{L}\\d";
const re = (s: string, flags = "iu") => new RegExp(`(?<![${L}])(?:${s})(?![${L}])`, flags);

const MONTHS: [RegExp, number][] = [
  ["січ(?:ня|ень)?|jan(?:uary)?", 0], ["лют(?:ого|ий)?|feb(?:ruary)?", 1], ["берез(?:ня|ень)|mar(?:ch)?", 2], ["квіт(?:ня|ень)|apr(?:il)?", 3],
  ["трав(?:ня|ень)|may", 4], ["черв(?:ня|ень)|june?", 5], ["лип(?:ня|ень)|july?", 6], ["серп(?:ня|ень)|aug(?:ust)?", 7],
  ["верес(?:ня|ень)|sep(?:t(?:ember)?)?", 8], ["жовт(?:ня|ень)|oct(?:ober)?", 9], ["листопад(?:а)?|nov(?:ember)?", 10], ["груд(?:ня|ень)|dec(?:ember)?", 11],
].map(([s, n]) => [new RegExp(`^(?:${s})$`, "iu"), n as number]);
const MONTH_WORD = "січ(?:ня|ень)?|лют(?:ого|ий)?|берез(?:ня|ень)|квіт(?:ня|ень)|трав(?:ня|ень)|черв(?:ня|ень)|лип(?:ня|ень)|серп(?:ня|ень)|верес(?:ня|ень)|жовт(?:ня|ень)|листопад(?:а)?|груд(?:ня|ень)|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const monthIndex = (w: string) => MONTHS.find(([r]) => r.test(w))?.[1] ?? -1;

// Monday = 1 … Sunday = 0 (JS getDay)
const WEEKDAYS: [string, number][] = [
  ["понеділ(?:ок|ка)|monday|mon", 1], ["вівтор(?:ок|ка)|tuesday|tue", 2], ["серед(?:у|а|и)|wednesday|wed", 3], ["четвер(?:га)?|thursday|thu", 4],
  ["п'ятниц(?:ю|я|і)|friday|fri", 5], ["субот(?:у|а|и)|saturday|sat", 6], ["неділ(?:ю|я|і)|sunday|sun", 0],
];
const EVERY_WEEKDAY: [string, number][] = [
  ["щопонеділка|по понеділках|every monday|mondays", 1], ["щовівторка|по вівторках|every tuesday|tuesdays", 2], ["щосереди|по середах|every wednesday|wednesdays", 3],
  ["щочетверга|по четвергах|every thursday|thursdays", 4], ["щоп'ятниці|по п'ятницях|every friday|fridays", 5], ["щосуботи|по суботах|every saturday|saturdays", 6],
  ["щонеділі|по неділях|every sunday|sundays", 0],
];

const KIND_PREFIX: [RegExp, QuickKind][] = [
  [/^(?:нова\s+|нову\s+)?ціль\s*[:\-—]?\s+|^(?:new\s+)?goal\s*[:\-—]?\s+/iu, "goal"],
  [/^(?:нова\s+|нову\s+)?звичк[аю]\s*[:\-—]?\s+|^(?:new\s+)?habit\s*[:\-—]?\s+/iu, "habit"],
  [/^(?:нова\s+|нову\s+)?нотатк[аю]\s*[:\-—]?\s+|^(?:new\s+)?note\s*[:\-—]?\s+/iu, "note"],
  [/^(?:нова\s+|нову\s+)?(?:думк[аю]|іде[яю])\s*[:\-—]?\s+|^(?:new\s+)?(?:thought|idea)\s*[:\-—]?\s+/iu, "thought"],
  [/^(?:нова\s+|нову\s+)?задач[аю]\s*[:\-—]?\s+|^(?:new\s+)?(?:task|todo)\s*[:\-—]?\s+/iu, "task"],
];

const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

function nextWeekday(now: Date, dow: number, forceNext = false) {
  const today = startOfDay(now);
  let diff = (dow - today.getDay() + 7) % 7;
  if (forceNext && diff === 0) diff = 7;
  return addDays(today, diff);
}

const hm = (h: number, m: number) => h * 60 + m;
function toHour(h: number, mer?: string) {
  if (!mer) return h;
  const m = mer.toLowerCase();
  if (/^(pm|вечора|дня)$/.test(m) && h < 12) return h + 12;
  if (/^(am|ранку|ночі)$/.test(m) && h === 12) return 0;
  return h;
}

export function normalize(s: string) {
  return s.replace(/[’ʼ`´]/g, "'").replace(/\s+/g, " ").trim();
}

/** Lower-case word stems for fuzzy matching ("марафон" ~ "напівмарафон", "англійська" ~ "англійську"). */
function stems(s: string) {
  return normalize(s).toLowerCase().split(/[^\p{L}\d]+/u).filter((w) => w.length >= 3).map((w) => w.slice(0, Math.max(4, w.length - 2)));
}

export function matchGoal<T extends { id: string; title: string }>(query: string, goals: T[]): T | null {
  const q = stems(query);
  if (!q.length) return null;
  let best: T | null = null, bestScore = 0;
  for (const g of goals) {
    const title = normalize(g.title).toLowerCase();
    const score = q.filter((w) => title.includes(w)).length / q.length;
    if (score > bestScore) { best = g; bestScore = score; }
  }
  return bestScore >= 0.5 ? best : null;
}

export function quickParse(input: string, opts: { now?: Date; goals?: { id: string; title: string }[] } = {}): Parsed {
  const now = opts.now ?? new Date();
  let rest = ` ${normalize(input)} `;
  let signals = 0;
  const take = (r: RegExp, fn: (m: RegExpExecArray) => void) => {
    const m = r.exec(rest);
    if (!m) return false;
    fn(m);
    rest = rest.slice(0, m.index) + " " + rest.slice(m.index + m[0].length);
    signals++;
    return true;
  };

  // Kind
  let kind: QuickKind = "task", kindExplicit = false;
  const trimmed = rest.trim();
  for (const [r, k] of KIND_PREFIX) {
    const m = r.exec(trimmed);
    if (m) { kind = k; kindExplicit = true; rest = ` ${trimmed.slice(m[0].length)} `; signals++; break; }
  }

  // Tags & priority
  const tags: string[] = [];
  rest = rest.replace(/(^|\s)#([\p{L}\d_'-]+)/gu, (_, sp, t) => { tags.push(t.toLowerCase()); signals++; return sp; });
  let priority: Priority | null = null;
  void (take(re("терміново|невідкладно|urgent|asap|!!!"), () => (priority = "URGENT")) || take(re("важливо|важливе|important|!!"), () => (priority = "HIGH")));

  // Recurrence
  let recurrence: Recurrence | null = null;
  let date: Date | null = null;
  for (const [s, dow] of EVERY_WEEKDAY) {
    if (take(re(s), () => { recurrence = "WEEKLY"; date = nextWeekday(now, dow); })) break;
  }
  if (!recurrence) {
    void (take(re("щодня|щоденно|кожен день|кожного дня|every day|daily|each day"), () => (recurrence = "DAILY")) ||
    take(re("по буднях|в будні|у будні|щобудня|weekdays|every weekday|on weekdays"), () => (recurrence = "WEEKDAYS")) ||
    take(re("щотижня|щотижнево|кожного тижня|кожен тиждень|every week|weekly"), () => (recurrence = "WEEKLY")) ||
    take(re("щомісяця|щомісячно|кожного місяця|every month|monthly"), () => (recurrence = "MONTHLY")));
  }

  // Habit reminder "нагадати о 12" / "remind at 8"
  let reminder: string | null = null;
  take(/(?:,\s*)?(?:нагадати|нагадування|нагадуй|remind(?:\s+me)?)\s+(?:о|об|в|at)?\s*(\d{1,2})(?:[:.](\d{2}))?/iu, (m) => (reminder = `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`));

  // Time range "з 9 до 10:30" / "from 9 to 10"
  let time: number | null = null, endTime: number | null = null;
  take(re(`(?:з|від|from)\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm)?\\s*(?:до|по|to|-|–)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|ранку|вечора|дня)?`), (m) => {
    time = hm(toHour(+m[1], m[3] ?? m[6]), +(m[2] ?? 0));
    endTime = hm(toHour(+m[4], m[6]), +(m[5] ?? 0));
  });
  if (time === null) {
    void (take(re(`(?:о|об|в|у|at|@)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|ранку|вечора|дня|ночі)?`), (m) => (time = hm(toHour(+m[1], m[3]), +(m[2] ?? 0)))) ||
    take(re(`(\\d{1,2}):(\\d{2})\\s*(am|pm)?`), (m) => (time = hm(toHour(+m[1], m[3]), +m[2]))) ||
    take(re(`(\\d{1,2})\\s*(am|pm)`), (m) => (time = hm(toHour(+m[1], m[2]), 0))));
  }
  if (time !== null && (time >= 24 * 60 || time < 0)) time = null;

  // Duration "1 год", "45 хв", "1.5 години", "півгодини", "for 2 hours", "30 min"
  let duration: number | null = null;
  void (take(re("півгодини|пів години|half an hour"), () => (duration = 30)) ||
  take(re(`(?:на|for)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:год(?:ин[иау]?)?|h|hr|hrs|hours?)`), (m) => (duration = Math.round(parseFloat(m[1].replace(",", ".")) * 60))) ||
  take(re(`(?:на|for)?\\s*(\\d+)\\s*(?:хв(?:илин[иау]?)?|m|min|mins|minutes?)`), (m) => (duration = +m[1])));

  // Dates
  if (!date) {
    void (take(re("післязавтра|day after tomorrow"), () => (date = addDays(startOfDay(now), 2))) ||
    take(re("завтра|tomorrow|tmrw"), () => (date = addDays(startOfDay(now), 1))) ||
    take(re("сьогодні|today|tonight|сьогодні ввечері"), () => (date = startOfDay(now))) ||
    take(re(`(?:через|in)\\s+(\\d+)\\s*(дн(?:і|ів|я|ь)|день|days?|тижн(?:і|ів|я|ень)|тиждень|weeks?)`), (m) => {
      const n = +m[1] * (/^(т|w)/i.test(m[2]) ? 7 : 1);
      date = addDays(startOfDay(now), n);
    }) ||
    take(re(`(?:наступного тижня|next week)`), () => (date = nextWeekday(now, 1, true))) ||
    take(re(`(?:до|by|till|until)\\s+(?:(\\d{1,2})\\s+)?(${MONTH_WORD})`), (m) => {
      const mi = monthIndex(m[2]);
      let y = now.getFullYear();
      if (mi < now.getMonth() || (mi === now.getMonth() && m[1] && +m[1] < now.getDate())) y++;
      date = m[1] ? new Date(y, mi, +m[1]) : new Date(y, mi + 1, 0);
    }) ||
    take(re(`(\\d{1,2})\\s+(${MONTH_WORD})|(${MONTH_WORD})\\s+(\\d{1,2})`), (m) => {
      const day = +(m[1] ?? m[4]);
      const mi = monthIndex(m[2] ?? m[3]);
      let y = now.getFullYear();
      if (new Date(y, mi, day) < startOfDay(now)) y++;
      date = new Date(y, mi, day);
    }) ||
    take(re(`(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?`), (m) => {
      const day = +m[1], mi = +m[2] - 1;
      if (mi < 0 || mi > 11 || day < 1 || day > 31) return;
      let y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
      if (!m[3] && new Date(y, mi, day) < startOfDay(now)) y++;
      date = new Date(y, mi, day);
    }));
    if (!date) {
      for (const [s, dow] of WEEKDAYS) {
        if (take(re(`(?:(?:в|у|на|on)\\s+)?(?:(наступн(?:ий|ого|у|ої)|next)\\s+)?(?:${s})`), (m) => (date = nextWeekday(now, dow, !!m[1])))) break;
      }
    }
  }
  // Goal link (parsed last so dates/recurrence aren't swallowed): "до цілі X", "for goal X" — up to a comma or the end
  let goalQuery: string | null = null;
  if (kind !== "goal") {
    take(/(?:,\s*)?(?:(?:прив'язати|привязати|додати|link(?:ed)?|attach)\s+)?(?:до\s+цілі|для\s+цілі|у\s+ціль|в\s+ціль|ціль(?=\s*:)|to\s+(?:the\s+)?goal|for\s+(?:the\s+)?goal|goal(?=\s*:))\s*[:\-—]?\s+([^,;]+?)(?=\s*(?:[,;]|$))/iu, (m) => (goalQuery = m[1].trim()));
  }

  // A time without a date means the next time that clock time comes round.
  if (time !== null && !date) date = time > hm(now.getHours(), now.getMinutes()) ? startOfDay(now) : addDays(startOfDay(now), 1);

  // Habits: frequency lives in recurrence; a "time" is really a reminder.
  if (kind === "habit" && time !== null && !reminder) {
    reminder = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
    time = null;
  }

  const title = rest
    .replace(/\s*[,;]\s*(?=[,;]|$)/g, "")
    .replace(/\s+([,;.!?])/g, "$1")
    .replace(/^[\s,;:.\-—]+|[\s,;:\-—]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const goal = goalQuery && opts.goals ? matchGoal(goalQuery, opts.goals) : null;

  return {
    kind, kindExplicit,
    title: title ? title[0].toUpperCase() + title.slice(1) : "",
    date, time, endTime, duration, recurrence, goalQuery, goal, priority, tags, reminder, signals,
  };
}

/** Start/end of the time block implied by a parse (default 30 min). */
export function blockOf(p: Parsed): { start: Date; end: Date } | null {
  if (!p.date || p.time === null) return null;
  const start = new Date(p.date);
  start.setHours(Math.floor(p.time / 60), p.time % 60, 0, 0);
  const mins = p.endTime !== null && p.endTime > p.time ? p.endTime - p.time : p.duration ?? 30;
  return { start, end: new Date(start.getTime() + mins * 60_000) };
}
