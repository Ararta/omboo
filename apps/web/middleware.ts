import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, decodeSession, ROLE_HOME, ROLE_PREFIX } from "./lib/jwt";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = decodeSession(req.cookies.get(ACCESS_COOKIE)?.value);

  if (pathname === "/login" || pathname === "/register") {
    if (session) return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  }

  const ownPrefix = ROLE_PREFIX[session.role];
  const isAnyRoleRoute = Object.values(ROLE_PREFIX).some((prefix) => pathname.startsWith(prefix));
  if (isAnyRoleRoute && !pathname.startsWith(ownPrefix)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
