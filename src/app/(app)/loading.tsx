import { PageSkeleton } from "@/components/ui/misc";

/**
 * Instant feedback on navigation. Having a loading boundary also lets Next.js prefetch
 * every sidebar link up to this point, so a click switches pages without waiting for the server.
 */
export default function Loading() {
  return <PageSkeleton />;
}
