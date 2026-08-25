import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { ACCESS_COOKIE, decodeSession, REFRESH_COOKIE, type SessionPayload } from "./jwt";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export function getSession(): SessionPayload | null {
  return decodeSession(cookies().get(ACCESS_COOKIE)?.value);
}

export function getRefreshTokenFromCookies(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}

export function setSessionCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, accessToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: ACCESS_TTL_SECONDS });
  response.cookies.set(REFRESH_COOKIE, refreshToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: REFRESH_TTL_SECONDS });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}
