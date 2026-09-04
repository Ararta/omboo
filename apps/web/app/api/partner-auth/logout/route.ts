import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend";
import { clearPartnerSessionCookies, getPartnerRefreshTokenFromCookies } from "../../../../lib/partner-session";

export async function POST() {
  const refreshToken = getPartnerRefreshTokenFromCookies();
  if (refreshToken) {
    await fetch(backendUrl("/partner-auth/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => {});
  }
  const response = NextResponse.json({ ok: true });
  clearPartnerSessionCookies(response);
  return response;
}
