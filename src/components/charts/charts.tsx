"use client";
import { useState } from "react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Single-series daily bar chart (one hue, no legend — the card title names it).
 * Thin bars with rounded data-ends on the baseline, 2px gaps, recessive axis,
 * hover tooltip per bar and an accessible table fallback.
 */
export function DailyBars({ values, since, label, height = 120, className }: { values: number[]; since: string | Date; label: string; height?: number; className?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const start = new Date(since);
  const w = 100 / values.length;
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <figure className={cn("relative", className)}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full overflow-visible" style={{ height }} role="img" aria-label={`${label}: ${total} in the last ${values.length} days`}>
        {[0.5, 1].map((f) => <line key={f} x1="0" x2="100" y1={height - f * (height - 8)} y2={height - f * (height - 8)} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 3" />)}
        {values.map((v, i) => {
          const h = v ? Math.max(3, (v / max) * (height - 8)) : 0;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * w} y={0} width={w} height={height} fill="transparent" />
              {v > 0 && <rect x={i * w + w * 0.18} y={height - h} width={w * 0.64} height={h} rx="1.2" fill="var(--accent)" opacity={hover === null || hover === i ? 1 : 0.45} />}
              {v === 0 && <rect x={i * w + w * 0.18} y={height - 1.5} width={w * 0.64} height={1.5} fill="var(--border-strong)" />}
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-muted tabular">
        <span>{format(start, "d MMM")}</span><span>Today</span>
      </div>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-card"
          style={{ left: `${(hover + 0.5) * w}%` }}>
          <span className="font-semibold tabular">{values[hover]}</span> <span className="text-muted">{format(addDays(start, hover), "EEE d MMM")}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{values.map((v, i) => <tr key={i}><td>{format(addDays(start, i), "yyyy-MM-dd")}</td><td>{v}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Sequential (one hue, light→dark) day grid for habit consistency. */
export function HabitHeat({ counts, target, color, days = 28, size = 13 }: { counts: Record<string, number>; target: number; color: string; days?: number; size?: number }) {
  const today = new Date();
  const cells = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  return (
    <div className="flex flex-wrap gap-[3px]" role="img" aria-label={`${cells.filter((d) => (counts[format(d, "yyyy-MM-dd")] ?? 0) >= target).length} of ${days} days completed`}>
      {cells.map((d) => {
        const k = format(d, "yyyy-MM-dd");
        const c = counts[k] ?? 0;
        const ratio = Math.min(1, c / Math.max(1, target));
        return (
          <span key={k} title={`${format(d, "EEE d MMM")}: ${c}/${target}`} className="rounded-[3px]"
            style={{ width: size, height: size, background: ratio ? `color-mix(in oklab, ${color} ${25 + ratio * 75}%, var(--surface-2))` : "var(--surface-3)" }} />
        );
      })}
    </div>
  );
}
