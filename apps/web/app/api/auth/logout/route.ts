import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend";
import { clearSessionCookies, getRefreshTokenFromCookies } from "../../../../lib/session";

export async function POST() {
  const refreshToken = getRefreshTokenFromCookies();
  if (refreshToken) {
    await fetch(backendUrl("/auth/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => {});
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
