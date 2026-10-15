import { NextResponse, type NextRequest } from "next/server";
import { isAdminHost } from "@/lib/admin-host";

const PUBLIC = ["/login", "/register", "/forgot", "/guide"];

const notFound = (req: NextRequest) => NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });

/**
 * The admin panel lives on its own subdomain. There every page path is served from /admin/*
 * and only /api/admin/* is reachable; on the main site /admin does not exist at all.
 */
function adminHost(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) return pathname.startsWith("/api/admin/") ? NextResponse.next() : notFound(req);
  if (pathname.startsWith("/admin")) return notFound(req);
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return NextResponse.next();
  if (!req.cookies.has("nodera_admin") && pathname !== "/login") {
    // Build from the Host header so the redirect stays on the admin subdomain behind any proxy.
    const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
    return NextResponse.redirect(new URL("/login", `${proto}://${req.headers.get("host")}`));
  }
  const url = req.nextUrl.clone();
  url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

/** Cheap cookie-presence gate. Real session validation happens in layouts and API handlers. */
export function middleware(req: NextRequest) {
  if (isAdminHost(req.headers.get("host"))) return adminHost(req);
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin/")) return notFound(req);
  if (pathname.startsWith("/api/")) return NextResponse.next();
  // Landing CTAs point at /login?mode=signup; registration lives at /register.
  if (pathname === "/login" && req.nextUrl.searchParams.get("mode") === "signup") {
    const url = req.nextUrl.clone();
    url.pathname = "/register";
    url.searchParams.delete("mode");
    return NextResponse.redirect(url);
  }
  // Static files from /public (e.g. /promo.mp4) are public.
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return NextResponse.next();
  const hasSession = req.cookies.has("nodera_session");
  if (!hasSession && !PUBLIC.includes(pathname) && pathname !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/dashboard" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
