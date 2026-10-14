import { route } from "@/lib/http";
import { destroyAdminSession } from "@/server/admin";

export const POST = route(async () => {
  await destroyAdminSession();
  return { ok: true };
});
