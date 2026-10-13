import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/register"];

/** Cheap cookie-presence gate. Real session validation happens in layouts and API handlers. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
