"use client";
import { useEffect, useMemo, useState } from "react";
import { useLanding } from "./ui";
import type { Copy } from "./i18n";

export type SphereId = "health" | "ideas" | "study" | "business";
type ThoughtId = keyof Copy["map"]["thoughts"];

export const W = 880;
export const H = 604;
const ME = { x: 440, y: 318 };

export const SPHERES: { id: SphereId; x: number; y: number; icon: string; color: string }[] = [
  { id: "health", x: 235, y: 192, icon: "☾", color: "var(--health)" },
  { id: "ideas", x: 652, y: 178, icon: "✦", color: "var(--ideas)" },
  { id: "study", x: 248, y: 452, icon: "◎", color: "var(--study)" },
  { id: "business", x: 640, y: 446, icon: "▲", color: "var(--business)" },
];
const HEX: Record<SphereId, string> = { health: "#B5873A", ideas: "#7C70BF", study: "#4F9277", business: "#BF6E4E" };

const THOUGHTS: { id: ThoughtId; sphere: SphereId; x: number; y: number }[] = [
  { id: "run", sphere: "health", x: 100, y: 138 },
  { id: "sleep", sphere: "health", x: 302, y: 86 },
  { id: "cafe", sphere: "ideas", x: 556, y: 84 },
  { id: "podcast", sphere: "ideas", x: 772, y: 140 },
  { id: "session", sphere: "study", x: 112, y: 520 },
  { id: "english", sphere: "study", x: 302, y: 562 },
  { id: "bot", sphere: "business", x: 790, y: 452 },
  { id: "mvp", sphere: "business", x: 606, y: 562 },
];

const CROSS: { id: string; from: ThoughtId; to: ThoughtId; c: [number, number]; color: string; chip?: boolean }[] = [
  { id: "sleep-mvp", from: "sleep", to: "mvp", c: [690, 228], color: HEX.health, chip: true },
  { id: "english-podcast", from: "english", to: "podcast", c: [840, 600], color: HEX.study },
];

/** Quadratic curve bowed sideways by `bend` px; returns the path and its midpoint. */
function curve(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
  return { d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`, mid: { x: 0.25 * a.x + 0.5 * cx + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cy + 0.25 * b.y } };
}
const qMid = (a: { x: number; y: number }, c: [number, number], b: { x: number; y: number }) => ({ x: 0.25 * a.x + 0.5 * c[0] + 0.25 * b.x, y: 0.25 * a.y + 0.5 * c[1] + 0.25 * b.y });
const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** The interactive mind-map scene (fixed 880×604 stage, scaled by its parent). */
export function ThoughtMap() {
  const { t } = useLanding();
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<{ kind: "thought"; id: ThoughtId } | { kind: "sphere"; id: SphereId } | null>(null);
  const [filter, setFilter] = useState<SphereId | null>(null);

  const geo = useMemo(() => {
    const spokes = SPHERES.map((s, i) => ({ ...s, ...curve(ME, s, i % 2 ? -34 : 34) }));
    const branches = THOUGHTS.map((th) => {
      const s = SPHERES.find((x) => x.id === th.sphere)!;
      return { ...th, ...curve(s, th, 14) };
    });
    const cross = CROSS.map((c) => {
      const a = THOUGHTS.find((x) => x.id === c.from)!, b = THOUGHTS.find((x) => x.id === c.to)!;
      return { ...c, d: `M${a.x} ${a.y} Q${c.c[0]} ${c.c[1]} ${b.x} ${b.y}`, mid: qMid(a, c.c, b), spheres: [a.sphere, b.sphere] };
    });
    return { spokes, branches, cross };
  }, []);

  // Which elements stay lit for the current hover / filter.
  const lit = useMemo(() => {
    const spheres = new Set<SphereId>(), thoughts = new Set<string>(), cross = new Set<string>();
    if (hover?.kind === "thought") {
      const th = THOUGHTS.find((x) => x.id === hover.id)!;
      spheres.add(th.sphere); thoughts.add(th.id);
      for (const c of CROSS) if (c.from === th.id || c.to === th.id) { cross.add(c.id); [c.from, c.to].forEach((x) => { thoughts.add(x); spheres.add(THOUGHTS.find((y) => y.id === x)!.sphere); }); }
      return { spheres, thoughts, cross, any: true };
    }
    const sid = hover?.kind === "sphere" ? hover.id : filter;
    if (sid) {
      spheres.add(sid);
      THOUGHTS.filter((x) => x.sphere === sid).forEach((x) => thoughts.add(x.id));
      return { spheres, thoughts, cross, any: true };
    }
    return { spheres, thoughts, cross, any: false };
  }, [hover, filter]);
  const cls = (on: boolean) => (lit.any ? (on ? "l-lit" : "l-dim") : "");

  return (
    <div className="relative h-full w-full" style={{ backgroundImage: "radial-gradient(#E3DED4 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <defs>
          {geo.spokes.map((s) => (
            <linearGradient key={s.id} id={`lg-${s.id}`} gradientUnits="userSpaceOnUse" x1={ME.x} y1={ME.y} x2={s.x} y2={s.y}>
              <stop offset="0" stopColor="#A49CD8" /><stop offset="1" stopColor={HEX[s.id]} />
            </linearGradient>
          ))}
          <radialGradient id="me-glow"><stop offset="0" stopColor="#5F56B0" stopOpacity=".16" /><stop offset="1" stopColor="#5F56B0" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx={ME.x} cy={ME.y} r="110" fill="url(#me-glow)" />
        <circle cx={ME.x} cy={ME.y} r="128" fill="none" stroke="#DDD8EC" strokeDasharray="3 6" />
        <circle cx={ME.x} cy={ME.y} r="250" fill="none" stroke="#E8E4DB" strokeDasharray="3 7" />
        {geo.branches.map((b) => (
          <path key={b.id} d={b.d} pathLength={1} className={`l-map-line ${cls(lit.thoughts.has(b.id))}`} fill="none" stroke={HEX[b.sphere]} strokeOpacity=".55" strokeWidth="1.3" style={{ animationDelay: ".7s" }} />
        ))}
        {geo.spokes.map((s, i) => (
          <path key={s.id} id={`spoke-${s.id}`} d={s.d} pathLength={1} className={`l-map-line ${cls(lit.spheres.has(s.id))}`} fill="none" stroke={`url(#lg-${s.id})`} strokeWidth="2" strokeLinecap="round" style={{ animationDelay: `${0.15 * i}s` }} />
        ))}
        {geo.cross.map((c) => (
          <path key={c.id} d={c.d} className={`l-map-dash ${cls(lit.cross.has(c.id))}`} fill="none" stroke={c.color} strokeOpacity=".75" strokeWidth="1.4" strokeDasharray="4 5" />
        ))}
        {!reduced && geo.spokes.map((s, i) => (
          <circle key={s.id} r="3.6" fill={HEX[s.id]} className={cls(lit.spheres.has(s.id))}>
            <animateMotion dur={`${3.6 + i * 0.4}s`} begin={`${1.4 + i * 0.5}s`} repeatCount="indefinite" path={s.d} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.85;1" dur={`${3.6 + i * 0.4}s`} begin={`${1.4 + i * 0.5}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {reduced && geo.spokes.map((s) => <circle key={s.id} cx={s.mid.x} cy={s.mid.y} r="3.4" fill={HEX[s.id]} />)}
      </svg>

      {/* Filter chips */}
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5">
        <button onClick={() => setFilter(null)} className={`h-7 rounded-full px-3 text-[12px] font-semibold transition-colors ${filter === null ? "bg-[var(--text)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"}`}>{t.map.all}</button>
        {SPHERES.map((s) => (
          <button key={s.id} onClick={() => setFilter(filter === s.id ? null : s.id)} aria-pressed={filter === s.id}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors ${filter === s.id ? "border-[var(--text)] bg-[var(--surface)] text-[var(--text)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"}`}>
            <span className="size-[7px] rounded-full" style={{ background: s.color }} />{t.map.spheres[s.id]}
          </button>
        ))}
      </div>

      {/* Cross-link chip */}
      {geo.cross.filter((c) => c.chip).map((c) => (
        <span key={c.id} className={`l-map-dash absolute z-[5] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#F0E2C6] bg-[#FBF3E4] px-2.5 py-[3px] text-[11.5px] font-medium text-[#8A6428] ${cls(lit.cross.has(c.id))}`} style={pct(c.mid.x, c.mid.y)}>{t.map.link}</span>
      ))}

      {/* Me */}
      <div className="absolute z-10 grid size-[74px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--text)] text-[18px] font-semibold text-white" style={{ ...pct(ME.x, ME.y), fontFamily: "var(--font-head)", boxShadow: "0 0 0 10px rgba(95,86,176,.10), 0 0 0 22px rgba(95,86,176,.05), 0 14px 30px -10px rgba(42,44,51,.45)" }}>
        {t.map.me}
      </div>

      {/* Spheres */}
      {SPHERES.map((s, i) => (
        <button key={s.id} type="button" onMouseEnter={() => setHover({ kind: "sphere", id: s.id })} onMouseLeave={() => setHover(null)} onFocus={() => setHover({ kind: "sphere", id: s.id })} onBlur={() => setHover(null)}
          className={`absolute z-10 flex flex-col items-center ${cls(lit.spheres.has(s.id))}`} style={{ ...pct(s.x, s.y), transform: "translate(-50%, -23px)" }}>
          <span className="l-breathe absolute left-1/2 top-[23px] block size-[46px] rounded-full" style={{ boxShadow: `0 0 0 7px ${HEX[s.id]}14, 0 10px 26px -6px ${HEX[s.id]}55`, animationDelay: `${i * 0.6}s` }} />
          <span className="l-pulse relative grid size-[46px] place-items-center rounded-full border-[1.5px] bg-white text-[17px] leading-none" style={{ borderColor: s.color, color: s.color, animationDelay: `${i * 0.6}s` }}>{s.icon}</span>
          <span className="relative mt-1.5 whitespace-nowrap text-[12.5px] font-semibold text-[var(--text)]">{t.map.spheres[s.id]}</span>
        </button>
      ))}

      {/* Thoughts */}
      {THOUGHTS.map((th) => {
        const on = lit.thoughts.has(th.id);
        return (
          <button key={th.id} type="button" onMouseEnter={() => setHover({ kind: "thought", id: th.id })} onMouseLeave={() => setHover(null)} onFocus={() => setHover({ kind: "thought", id: th.id })} onBlur={() => setHover(null)}
            className={`absolute z-10 inline-flex h-[30px] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border bg-white px-3 text-[12.5px] font-medium text-[var(--text)] transition-[border-color,box-shadow,opacity] duration-200 ${cls(on)}`}
            style={{ ...pct(th.x, th.y), borderColor: on && hover?.kind === "thought" ? HEX[th.sphere] : "var(--border)", boxShadow: on && hover?.kind === "thought" ? `0 6px 16px -8px ${HEX[th.sphere]}` : "0 1px 2px rgba(42,44,51,.05)" }}>
            <span className="size-[7px] rounded-full" style={{ background: HEX[th.sphere] }} />{t.map.thoughts[th.id]}
          </button>
        );
      })}
    </div>
  );
}

/** Phone version: the same idea as a simple vertical list. */
export function ThoughtMapCompact() {
  const { t } = useLanding();
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-[var(--text)] text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-head)", boxShadow: "0 0 0 7px rgba(95,86,176,.10)" }}>{t.map.me}</span>
        <span className="text-[13px] text-[var(--text-muted)]">{t.map.label}</span>
      </div>
      <ul className="space-y-2.5">
        {SPHERES.map((s) => (
          <li key={s.id} className="rounded-2xl border border-[var(--border)] bg-white p-3">
            <p className="flex items-center gap-2 text-[14px] font-semibold"><span className="grid size-7 place-items-center rounded-full border-[1.5px] text-[13px]" style={{ borderColor: s.color, color: s.color }}>{s.icon}</span>{t.map.spheres[s.id]}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {THOUGHTS.filter((x) => x.sphere === s.id).map((th) => (
                <span key={th.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[12.5px]"><span className="size-[6px] rounded-full" style={{ background: HEX[s.id] }} />{t.map.thoughts[th.id]}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 inline-flex rounded-full border border-[#F0E2C6] bg-[#FBF3E4] px-2.5 py-1 text-[12px] font-medium text-[#8A6428]">{t.map.link}</p>
    </div>
  );
}
