import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend";
import { setSessionCookies } from "../../../../lib/session";
import { extractOrgSlugFromHost } from "../../../../lib/subdomain";

export async function POST(req: Request) {
  const body = await req.json();
  const upstream = await fetch(backendUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  // Backend ("HR"/"DIRECTOR") logins go through TOTP first — no tokens yet in that case,
  // just pass the setup/challenge info through for the login page to continue the flow.
  if (data.totpSetupRequired || data.requiresTotp) {
    return NextResponse.json(data);
  }

  // On a real org subdomain (<slug>.omboo.am / <slug>.localhost), the account must belong to
  // that exact organization — otherwise a correct email+password for a DIFFERENT org would
  // silently open a session under the wrong subdomain's context. The bare root host (no slug)
  // is the shared/dev login page and skips this check.
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
