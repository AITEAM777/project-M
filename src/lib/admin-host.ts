/** Pure helpers shared by middleware (edge) and the server. */

/** admin.noderamind.com, admin.localhost:3000 … */
export function isAdminHost(host: string | null | undefined) {
  return !!host && host.split(":")[0].toLowerCase().startsWith("admin.");
}

/** ADMIN_EMAILS="a@x.com, b@y.com" → ["a@x.com", "b@y.com"] */
export function parseAdminEmails(raw: string | undefined) {
  return (raw ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}
