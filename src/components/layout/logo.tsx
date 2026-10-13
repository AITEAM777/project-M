import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M20 22l12 10 12-10M32 32v12" /></g>
      <g fill="#fff"><circle cx="20" cy="22" r="5" /><circle cx="44" cy="22" r="5" /><circle cx="32" cy="32" r="4" /><circle cx="32" cy="46" r="5" /></g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-2 font-semibold tracking-tight text-[17px]">
      <LogoMark />
      Nodera
    </Link>
  );
}
