import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser, type SessionUser } from "./auth";
import { prisma } from "./db";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);
export const forbidden = () => new HttpError(403, "You do not have access to this resource");

type Ctx = { params: Promise<Record<string, string>> };
type Handler = (req: Request, ctx: { params: Record<string, string> }) => Promise<unknown>;

/** Wraps a route handler: JSON response, consistent error mapping, structured logs. */
export function route(fn: Handler) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const params = ctx?.params ? await ctx.params : {};
      const result = await fn(req, { params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Validation failed", details: err.flatten() }, { status: 400 });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (err.code === "P2002") return NextResponse.json({ error: "Already exists" }, { status: 409 });
        if (err.code === "P2003") return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
      }
      logger.error("api.unhandled", { url: req.url, method: req.method, err: String(err), stack: (err as Error)?.stack });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Not authenticated");
  return user;
}

export async function parseBody<T extends ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

export function searchParam(req: Request, key: string) {
  return new URL(req.url).searchParams.get(key);
}

const ROLE_RANK = { VIEWER: 0, EDITOR: 1, OWNER: 2 } as const;
type Role = keyof typeof ROLE_RANK;

/** Ensures the user belongs to the workspace with at least `min` role. */
export async function requireMember(userId: string, workspaceId: string | null | undefined, min: Role = "EDITOR") {
  if (!workspaceId) throw new HttpError(400, "workspaceId is required");
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m) throw notFound("Workspace");
  if (ROLE_RANK[m.role] < ROLE_RANK[min]) throw forbidden();
  return m;
}

/** Common pattern: authenticated user + workspace from `?ws=` query param. */
export async function userAndWorkspace(req: Request, min: Role = "VIEWER") {
  const user = await requireUser();
  const ws = searchParam(req, "ws");
  await requireMember(user.id, ws, min);
  return { user, workspaceId: ws as string };
}

/**
 * Loads an entity by id (any model with workspaceId) and verifies membership.
 * Returns 404 (not 403) for foreign records so ids can't be probed.
 */
export async function loadOwned<T extends { workspaceId: string }>(
  userId: string,
  loader: () => Promise<T | null>,
  min: Role = "EDITOR",
  what = "Resource",
): Promise<T> {
  const entity = await loader();
  if (!entity) throw notFound(what);
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: entity.workspaceId, userId } },
  });
  if (!m) throw notFound(what);
  if (ROLE_RANK[m.role] < ROLE_RANK[min]) throw forbidden();
  return entity;
}

/** Verifies that optional foreign keys supplied by the client point into the same workspace. */
export async function assertSameWorkspace(
  workspaceId: string,
  refs: { folderId?: string | null; projectId?: string | null; goalId?: string | null; milestoneId?: string | null; noteId?: string | null; habitId?: string | null; taskId?: string | null },
) {
  const checks: Promise<unknown>[] = [];
  const check = (p: Promise<{ workspaceId: string } | null>, name: string) =>
    checks.push(
      p.then((r) => {
        if (!r || r.workspaceId !== workspaceId) throw new HttpError(400, `Invalid ${name}`);
      }),
    );
  if (refs.folderId) check(prisma.folder.findUnique({ where: { id: refs.folderId }, select: { workspaceId: true } }), "folder");
  if (refs.projectId) check(prisma.project.findUnique({ where: { id: refs.projectId }, select: { workspaceId: true } }), "project");
  if (refs.goalId) check(prisma.goal.findUnique({ where: { id: refs.goalId }, select: { workspaceId: true } }), "goal");
  if (refs.noteId) check(prisma.note.findUnique({ where: { id: refs.noteId }, select: { workspaceId: true } }), "note");
  if (refs.habitId) check(prisma.habit.findUnique({ where: { id: refs.habitId }, select: { workspaceId: true } }), "habit");
  if (refs.taskId) check(prisma.task.findUnique({ where: { id: refs.taskId }, select: { workspaceId: true } }), "task");
  if (refs.milestoneId)
    check(
      prisma.milestone
        .findUnique({ where: { id: refs.milestoneId }, select: { goal: { select: { workspaceId: true } } } })
        .then((m) => (m ? { workspaceId: m.goal.workspaceId } : null)),
      "milestone",
    );
  await Promise.all(checks);
}

export async function logActivity(
  workspaceId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  await prisma.activity
    .create({ data: { workspaceId, userId, action, entityType, entityId, summary: summary.slice(0, 300) } })
    .catch((err) => logger.warn("activity.failed", { err: String(err) }));
}

/**
 * The client sends `tzo` (Date#getTimezoneOffset, minutes) with every request so
 * "today"/"this week" are computed in the user's local time, not the server's.
 */
export function localRanges(req: Request) {
  const tzo = Number(searchParam(req, "tzo") ?? 0) || 0;
  const offsetMs = -tzo * 60_000;
  const now = new Date();
  const local = new Date(now.getTime() + offsetMs); // wall-clock as UTC fields
  const dayStartUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs;
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  const weekStart = new Date(dayStartUtc - dow * 86400_000);
  const todayKey = local.toISOString().slice(0, 10);
  return {
    now,
    todayStart: new Date(dayStartUtc),
    todayEnd: new Date(dayStartUtc + 86400_000 - 1),
    weekStart,
    weekEnd: new Date(weekStart.getTime() + 7 * 86400_000 - 1),
    todayKey,
    offsetMs,
  };
}
