// Applies database migrations during the Vercel build, without flaky failures.
//
// Why: `prisma migrate deploy` takes a Postgres advisory lock. On Neon that fails
// intermittently when it goes through the connection pooler, when the database is
// waking up from sleep, or when two deployments start at the same moment. Each of
// those used to fail the whole deployment ("npm run vercel-build exited with 1")
// even though the next deployment worked.
//
// What this does:
//   1. Uses a direct (non-pooled) connection for migrations when one is available.
//   2. Retries transient connection/lock errors a few times with a growing pause.
import { spawnSync } from "node:child_process";

function directUrl() {
  const env = process.env;
  const explicit = env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DIRECT_URL;
  if (explicit) return explicit;
  const url = env.DATABASE_URL;
  if (!url) return undefined;
  try {
    const u = new URL(url);
    // Neon: "ep-xxx-pooler.region.aws.neon.tech" is the pooler, "ep-xxx.region…" the direct endpoint.
    if (u.hostname.includes("-pooler.")) u.hostname = u.hostname.replace("-pooler.", ".");
    u.searchParams.delete("pgbouncer");
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "30");
    return u.toString();
  } catch {
    return url;
  }
}

const TRANSIENT = /P1001|P1002|P1008|P1017|advisory lock|timed out|ECONNRESET|ETIMEDOUT|ECONNREFUSED|Can't reach database|Connection terminated|server closed the connection/i;
const url = directUrl();
const attempts = 5;

for (let i = 1; i <= attempts; i++) {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, ...(url ? { DATABASE_URL: url } : {}) },
    encoding: "utf8",
  });
  process.stdout.write(r.stdout ?? "");
  process.stderr.write(r.stderr ?? "");
  if (r.status === 0) process.exit(0);
  const out = `${r.stdout}\n${r.stderr}`;
  if (i === attempts || !TRANSIENT.test(out)) {
    console.error(`\nDatabase migration failed (attempt ${i}/${attempts}).`);
    process.exit(r.status ?? 1);
  }
  const wait = 5 * 2 ** (i - 1);
  console.warn(`\nDatabase not ready (attempt ${i}/${attempts}) — retrying in ${wait}s…`);
  await new Promise((res) => setTimeout(res, wait * 1000));
}
