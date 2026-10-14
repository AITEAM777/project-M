import { requireUser, route } from "@/lib/http";
import { cancelSubscription } from "@/server/billing";

export const POST = route(async () => {
  const user = await requireUser();
  await cancelSubscription(user.id);
  return { ok: true };
});
