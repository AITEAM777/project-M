"use client";
import useSWR, { mutate as globalMutate, type SWRConfiguration } from "swr";
import { useWorkspace } from "./store";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Adds ?ws= and ?tzo= (timezone offset) so the server can scope and localize. */
export function withParams(path: string, ws?: string | null) {
  const url = new URL(path, "http://x");
  if (ws && !url.searchParams.has("ws")) url.searchParams.set("ws", ws);
  url.searchParams.set("tzo", String(new Date().getTimezoneOffset()));
  return url.pathname + url.search;
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown; ws?: string | null } = {}): Promise<T> {
  const { json, ws, ...rest } = init;
  const res = await fetch(withParams(path, ws ?? useWorkspace.getState().id), {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
    window.location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
    throw new ApiError(401, "Session expired");
  }
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data ? String((data as { error: string }).error) : null) ?? `Request failed (${res.status})`;
    const details = typeof data === "object" ? (data as { details?: unknown }).details : undefined;
    throw new ApiError(res.status, friendlyValidation(msg, details), details);
  }
  return data as T;
}

function friendlyValidation(msg: string, details: unknown) {
  const fe = (details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
  if (msg === "Validation failed" && fe) {
    const first = Object.entries(fe).find(([, v]) => v?.length);
    if (first) return `${first[0]}: ${first[1][0]}`;
  }
  return msg;
}

export const get = <T,>(p: string) => api<T>(p);
export const post = <T,>(p: string, json?: unknown) => api<T>(p, { method: "POST", json: json ?? {} });
export const patch = <T,>(p: string, json: unknown) => api<T>(p, { method: "PATCH", json });
export const put = <T,>(p: string, json: unknown) => api<T>(p, { method: "PUT", json });
export const del = <T,>(p: string) => api<T>(p, { method: "DELETE" });

/** SWR hook scoped to the current workspace; key `null` disables fetching. */
export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  const ws = useWorkspace((s) => s.id);
  const key = path && ws ? [path, ws] : null;
  return useSWR<T>(key, ([p, w]: [string, string]) => api<T>(p, { ws: w }), { revalidateOnFocus: true, keepPreviousData: true, ...config });
}

/** Revalidates every cached request whose path starts with one of the prefixes. */
export function invalidate(...prefixes: string[]) {
  return globalMutate((key) => Array.isArray(key) && typeof key[0] === "string" && prefixes.some((p) => (key[0] as string).startsWith(p)));
}
