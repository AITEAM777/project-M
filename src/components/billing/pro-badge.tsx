import { cn } from "@/lib/utils";

/** Small "PRO" tag next to tools of the paid plans (shown on the free plan only). */
export function ProBadge({ className }: { className?: string }) {
  return <span className={cn("rounded bg-accent px-1 py-px text-[9.5px] font-bold leading-none tracking-wide text-accent-fg", className)}>PRO</span>;
}
