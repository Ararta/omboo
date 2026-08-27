import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend";
import { setSessionCookies } from "../../../../lib/session";
import { extractOrgSlugFromHost } from "../../../../lib/subdomain";

export async function POST(req: Request) {
  const body = await req.json();
  const upstream = await fetch(backendUrl("/auth/totp/setup-confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  // Same org-subdomain guard as /api/auth/login — this is where HR/DIRECTOR sessions (which go
  // through TOTP) actually get their cookies set.
  const hostSlug = extractOrgSlugFromHost(req.headers.get("host"));
  if (hostSlug && data.user?.organizationSlug && hostSlug !== data.user.organizationSlug) {
    return NextResponse.json(
      { message: `Այս հաշիվը «${data.user.organizationSlug}» կազմակերպությանն է. մուտք գործեք https://${data.user.organizationSlug}.omboo.am -ից։` },
      { status: 404 },
    );
  }

  const response = NextResponse.json({ user: data.user });
  setSessionCookies(response, data.accessToken, data.refreshToken);
  return response;
}
