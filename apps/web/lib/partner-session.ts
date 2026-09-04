import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { decodePartnerSession, PARTNER_ACCESS_COOKIE, PARTNER_REFRESH_COOKIE, type PartnerSessionPayload } from "./partner-jwt";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export function getPartnerSession(): PartnerSessionPayload | null {
  return decodePartnerSession(cookies().get(PARTNER_ACCESS_COOKIE)?.value);
}

export function getPartnerRefreshTokenFromCookies(): string | undefined {
  return cookies().get(PARTNER_REFRESH_COOKIE)?.value;
}

export function setPartnerSessionCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(PARTNER_ACCESS_COOKIE, accessToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: ACCESS_TTL_SECONDS });
  response.cookies.set(PARTNER_REFRESH_COOKIE, refreshToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: REFRESH_TTL_SECONDS });
}

export function clearPartnerSessionCookies(response: NextResponse): void {
  response.cookies.set(PARTNER_ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(PARTNER_REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}
