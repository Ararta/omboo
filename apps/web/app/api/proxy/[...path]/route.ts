import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "../../../../lib/jwt";
import { clearSessionCookies, setSessionCookies } from "../../../../lib/session";

/**
 * Same-origin authenticated proxy to the Nest API. The browser never holds a raw JWT —
 * client code calls `/api/proxy/<path>`, and this route attaches the real access token
 * (read from our own httpOnly cookie) as `Authorization: Bearer`, transparently refreshing
 * once on a 401 before giving up. This lets `middleware.ts` gate routes using a same-origin
 * cookie without the cross-origin cookie complications of talking to the Nest API's own
 * origin directly from the browser.
 */

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

async function refreshTokens(refreshToken: string): Promise<RefreshResult | null> {
  const res = await fetch(backendUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

async function forward(req: NextRequest, path: string[], accessToken: string | undefined, body: ArrayBuffer | null) {
  const url = backendUrl(`/${path.join("/")}${req.nextUrl.search}`);
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.delete("content-length");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  else headers.delete("authorization");

  return fetch(url, {
    method: req.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
    cache: "no-store",
  });
}

async function handler(req: NextRequest, context: { params: { path: string[] } }) {
  const accessCookie = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshCookie = req.cookies.get(REFRESH_COOKIE)?.value;
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const bodyBuffer = hasBody ? await req.arrayBuffer() : null;

  let upstream = await forward(req, context.params.path, accessCookie, bodyBuffer);
  let refreshed: RefreshResult | null = null;

  if (upstream.status === 401 && refreshCookie) {
    refreshed = await refreshTokens(refreshCookie);
    if (refreshed) {
      upstream = await forward(req, context.params.path, refreshed.accessToken, bodyBuffer);
    }
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const payload = await upstream.arrayBuffer();
  const response = new NextResponse(payload, {
    status: upstream.status,
    headers: { "content-type": contentType },
  });

  if (refreshed) {
    setSessionCookies(response, refreshed.accessToken, refreshed.refreshToken);
  } else if (upstream.status === 401) {
    clearSessionCookies(response);
  }

  return response;
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE, handler as PUT };
