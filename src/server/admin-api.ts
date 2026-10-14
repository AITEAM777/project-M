import "server-only";
import { HttpError } from "@/lib/http";
import { getAdmin } from "./admin";

/** Admin API guard. Non-admins get a plain 404 so the panel's existence isn't revealed. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new HttpError(404, "Not found");
  return admin;
}
