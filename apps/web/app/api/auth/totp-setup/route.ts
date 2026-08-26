import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend";
import { setSessionCookies } from "../../../../lib/session";

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

  const response = NextResponse.json({ user: data.user });
  setSessionCookies(response, data.accessToken, data.refreshToken);
  return response;
}
