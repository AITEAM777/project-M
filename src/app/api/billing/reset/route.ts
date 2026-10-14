import { requireUser, route } from "@/lib/http";
import { resetToFree } from "@/server/billing";

export const POST = route(async () => {
  const user = await requireUser();
  await resetToFree(user.id);
  return { ok: true };
});
