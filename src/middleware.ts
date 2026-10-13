import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/register"];

/** Cheap cookie-presence gate. Real session validation happens in layouts and API handlers. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
