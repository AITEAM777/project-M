import { requireUser, route } from "@/lib/http";
import { resumeSubscription } from "@/server/billing";

export const POST = route(async () => {
  const user = await requireUser();
  await resumeSubscription(user.id);
  return { ok: true };
});
