import "server-only";
import { localRanges } from "@/lib/http";
import { materializeReminders as core } from "@/lib/reminders-core";

/** Request-aware wrapper: computes "today" in the caller's timezone. */
export function materializeReminders(userId: string, workspaceId: string, req: Request) {
  return core(userId, workspaceId, localRanges(req));
}
