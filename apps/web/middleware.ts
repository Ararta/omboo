import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, decodeSession, ROLE_HOME, ROLE_PREFIX } from "./lib/jwt";
import { decodePartnerSession, PARTNER_ACCESS_COOKIE, PARTNER_HOME } from "./lib/partner-jwt";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // B2B Partner Portal — fully separate session/role domain from the org one below (partners
  // aren't in the Role enum at all, see partner-scope.ts's header comment for why). Handled
  // first and returns unconditionally, so nothing past this block ever sees a /partner path.
  if (pathname.startsWith("/partner")) {
    const partnerSession = decodePartnerSession(req.cookies.get(PARTNER_ACCESS_COOKIE)?.value);
    if (pathname === "/partner/login" || pathname === "/partner/register") {
      if (partnerSession) return NextResponse.redirect(new URL(PARTNER_HOME, req.url));
      return NextResponse.next();
    }
    if (!partnerSession) return NextResponse.redirect(new URL("/partner/login", req.url));
    return NextResponse.next();
  }

  const session = decodeSession(req.cookies.get(ACCESS_COOKIE)?.value);

  if (pathname === "/login" || pathname === "/register" || pathname === "/register-organization") {
    if (session) return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
    return NextResponse.next();
  }

  // Public, no session required — same rationale as login/register above.
  if (pathname === "/privacy") {
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
