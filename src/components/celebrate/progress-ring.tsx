export function ProgressRing({ value, size = 36, stroke = 4, color = "var(--accent)", track = "var(--surface-3)", label, className }: { value: number; size?: number; stroke?: number; color?: string; track?: string; label?: boolean; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={`${v}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(c * v) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 600ms cubic-bezier(.2,.8,.2,1)" }} />
      {label && <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill="currentColor" style={{ font: `600 ${Math.round(size * 0.24)}px var(--font-display)` }}>{v}%</text>}
    </svg>
  );
}
